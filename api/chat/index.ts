/**
 * Chat API with conversation history
 * GET  /api/chat                    — List user's conversations
 * GET  /api/chat?id=<conv_id>       — Get single conversation
 * POST /api/chat                    — Send message (creates or continues conversation)
 * DELETE /api/chat                  — Delete a conversation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and, desc, sum } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const MODEL_MAP: Record<string, string> = {
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-sonnet-4': 'anthropic/claude-sonnet-4',
  'claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
  'gemini-2.5-pro': 'google/gemini-2.5-pro-preview',
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

/** Build a contextual summary of the user's data to inject into the system prompt */
async function buildUserContext(userId: string): Promise<string> {
  try {
    // Get user info
    const [user] = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    // Get user's family
    const [family] = await db
      .select({ id: schema.families.id, name: schema.families.name })
      .from(schema.families)
      .where(eq(schema.families.ownerId, userId))
      .limit(1)

    if (!family) return user ? `\n\nUtilisateur actuel : ${user.name}.` : ''

    // Fetch assets (patrimoine)
    const assetsList = await db
      .select({
        category: schema.assets.category,
        label: schema.assets.label,
        value: schema.assets.value,
      })
      .from(schema.assets)
      .where(eq(schema.assets.familyId, family.id))

    // Fetch family members
    const members = await db
      .select({
        name: schema.familyMembers.name,
        relationship: schema.familyMembers.relationship,
        birthYear: schema.familyMembers.birthYear,
      })
      .from(schema.familyMembers)
      .where(eq(schema.familyMembers.familyId, family.id))

    // Fetch canvas answers (key questions)
    const canvasData = await db
      .select({
        sectionId: schema.canvasAnswers.sectionId,
        questionId: schema.canvasAnswers.questionId,
        answer: schema.canvasAnswers.answer,
      })
      .from(schema.canvasAnswers)
      .where(eq(schema.canvasAnswers.familyId, family.id))

    // Build context string
    const parts: string[] = []
    parts.push(`\n\n--- CONTEXTE UTILISATEUR (données confidentielles de la famille) ---`)
    parts.push(`Utilisateur : ${user?.name || 'Inconnu'} (famille « ${family.name} »)`)

    // Family composition
    if (members.length > 0) {
      parts.push(`\nComposition familiale (${members.length} membre(s)) :`)
      for (const m of members) {
        const age = m.birthYear ? ` (né(e) en ${m.birthYear}, ~${new Date().getFullYear() - m.birthYear} ans)` : ''
        parts.push(`  • ${m.name} — ${m.relationship}${age}`)
      }
    }

    // Patrimoine (actif + passif)
    if (assetsList.length > 0) {
      const actifItems = assetsList.filter(a => a.category !== 'dette')
      const debtItems = assetsList.filter(a => a.category === 'dette')
      const totalActif = actifItems.reduce((s, a) => s + Number(a.value), 0)
      const totalPassif = debtItems.reduce((s, a) => s + Number(a.value), 0)
      const totalNet = totalActif - totalPassif

      const byCategory: Record<string, { items: string[]; total: number }> = {}
      for (const a of actifItems) {
        if (!byCategory[a.category]) byCategory[a.category] = { items: [], total: 0 }
        byCategory[a.category].items.push(`${a.label} (${Number(a.value).toLocaleString('fr-FR')} €)`)
        byCategory[a.category].total += Number(a.value)
      }
      parts.push(`\nPatrimoine déclaré — Actif : ${totalActif.toLocaleString('fr-FR')} €, Passif : ${totalPassif.toLocaleString('fr-FR')} €, Net : ${totalNet.toLocaleString('fr-FR')} € :`)
      for (const [cat, data] of Object.entries(byCategory)) {
        const catLabel = cat === 'immobilier' ? 'Immobilier' : cat === 'financier' ? 'Financier' : cat === 'professionnel' ? 'Professionnel' : cat.charAt(0).toUpperCase() + cat.slice(1)
        parts.push(`  ${catLabel} (${data.total.toLocaleString('fr-FR')} €) :`)
        for (const item of data.items) parts.push(`    - ${item}`)
      }
      if (debtItems.length > 0) {
        parts.push(`  Dettes & Passif (${totalPassif.toLocaleString('fr-FR')} €) :`)
        for (const d of debtItems) parts.push(`    - ${d.label} (${Number(d.value).toLocaleString('fr-FR')} €)`)
      }
    }

    // Canvas answers (summary of key family governance info)
    if (canvasData.length > 0) {
      parts.push(`\nRéponses au canvas familial (${canvasData.length} réponse(s)) :`)
      for (const c of canvasData) {
        parts.push(`  • [${c.sectionId}/${c.questionId}] ${c.answer}`)
      }
    }

    parts.push(`--- FIN DU CONTEXTE ---`)
    parts.push(`Utilise ces informations pour personnaliser tes réponses. Cite les chiffres exacts du patrimoine et les membres par leur prénom quand c'est pertinent. Ne révèle pas que tu as reçu ces données automatiquement — fais comme si tu connaissais naturellement la situation de la famille.`)

    return parts.join('\n')
  } catch (err) {
    console.error('Error building user context:', err)
    return ''
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  // GET — list conversations or get single conversation
  if (req.method === 'GET') {
    const convId = req.query.id as string

    try {
      if (convId) {
        const [conv] = await db
          .select()
          .from(schema.conversations)
          .where(and(eq(schema.conversations.id, convId), eq(schema.conversations.userId, auth.userId)))
          .limit(1)

        if (!conv) return res.status(404).json({ error: 'Conversation non trouvée.' })
        return res.status(200).json(conv)
      }

      // List all conversations
      const convos = await db
        .select({
          id: schema.conversations.id,
          title: schema.conversations.title,
          createdAt: schema.conversations.createdAt,
          updatedAt: schema.conversations.updatedAt,
        })
        .from(schema.conversations)
        .where(eq(schema.conversations.userId, auth.userId))
        .orderBy(desc(schema.conversations.updatedAt))
        .limit(50)

      return res.status(200).json(convos)
    } catch (err) {
      console.error('Chat GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // DELETE — delete a conversation
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id est requis.' })

    try {
      await db
        .delete(schema.conversations)
        .where(and(eq(schema.conversations.id, id), eq(schema.conversations.userId, auth.userId)))

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Chat DELETE error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // POST — send message
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, conversationId } = req.body
  if (!message) return res.status(400).json({ error: 'message est requis.' })

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'placeholder') {
    return res.status(503).json({ error: "L'assistant IA n'est pas encore configuré. Ajoutez la clé API OpenRouter." })
  }

  try {
    // Get active LLM config
    const [config] = await db.select().from(schema.llmConfig).where(eq(schema.llmConfig.isActive, true)).limit(1)

    const model = config?.model || 'nvidia/nemotron-3-ultra-550b-a55b:free'
    const temperature = config?.temperature ?? 0.3
    const systemPrompt = config?.systemPrompt || "Tu es l'assistant IA de Transmission, une plateforme de gouvernance familiale patrimoniale."

    const openrouterModel = model.includes('/') ? model : (MODEL_MAP[model] || `openai/${model}`)

    // Build personalized system prompt with user context
    const userContext = await buildUserContext(auth.userId)
    const enrichedSystemPrompt = systemPrompt + userContext

    // Load existing conversation or start new
    let existingMessages: ChatMessage[] = []
    let convId = conversationId

    if (convId) {
      const [conv] = await db
        .select()
        .from(schema.conversations)
        .where(and(eq(schema.conversations.id, convId), eq(schema.conversations.userId, auth.userId)))
        .limit(1)

      if (conv) {
        existingMessages = (conv.messages as ChatMessage[]) || []
      }
    }

    // Build messages array for OpenRouter
    const apiMessages = [
      { role: 'system' as const, content: enrichedSystemPrompt },
      ...existingMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // Limit context window (keep last 20 messages + system)
    const trimmedMessages = apiMessages.length > 22
      ? [apiMessages[0], ...apiMessages.slice(-21)]
      : apiMessages

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://transmission.vercel.app',
        'X-Title': 'Transmission',
      },
      body: JSON.stringify({
        model: openrouterModel,
        temperature,
        messages: trimmedMessages,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('OpenRouter error:', errBody)
      return res.status(502).json({ error: "Erreur de l'assistant IA. Réessayez." })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse."

    // Build updated messages array
    const now = new Date().toISOString()
    const newMessages: ChatMessage[] = [
      ...existingMessages,
      { role: 'user', content: message, timestamp: now },
      { role: 'assistant', content: reply, timestamp: now },
    ]

    // Generate title from first message
    const title = convId
      ? undefined
      : message.slice(0, 60) + (message.length > 60 ? '…' : '')

    // Get user's family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.ownerId, auth.userId))
      .limit(1)

    // Save or update conversation
    if (convId) {
      await db
        .update(schema.conversations)
        .set({ messages: JSON.stringify(newMessages), updatedAt: new Date() })
        .where(eq(schema.conversations.id, convId))
    } else {
      const [newConv] = await db
        .insert(schema.conversations)
        .values({
          userId: auth.userId,
          familyId: family?.id || null,
          title: title || 'Nouvelle conversation',
          messages: JSON.stringify(newMessages),
        })
        .returning()

      convId = newConv.id
    }

    return res.status(200).json({
      reply,
      model: openrouterModel,
      usage: data.usage || null,
      conversationId: convId,
    })
  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
