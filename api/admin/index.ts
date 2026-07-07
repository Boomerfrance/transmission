/**
 * Consolidated Admin API
 * Routes via ?section= query parameter:
 *   ?section=llm     → LLM configuration (GET/POST)
 *   ?section=users   → User management (GET/PATCH)
 *   (default)        → LLM configuration
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

const DEFAULT_SYSTEM_PROMPT = `Tu es l'assistant IA de Transmission, une plateforme de gouvernance familiale patrimoniale.

Ton rôle :
- Aider les familles à comprendre les enjeux de la transmission patrimoniale en France
- Fournir des informations générales sur la fiscalité successorale
- Guider dans la préparation du dossier pour le notaire
- Faciliter le dialogue familial autour de la transmission

Règles :
- Information générale uniquement, jamais de conseil juridique personnalisé
- Recommander systématiquement un notaire ou CGP
- Communiquer en français, ton professionnel et accessible`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const section = (req.query.section as string) || 'llm'

  if (section === 'users') {
    return handleUsers(req, res)
  }

  return handleLlmConfig(req, res)
}

async function handleLlmConfig(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const [config] = await db.select().from(schema.llmConfig).where(eq(schema.llmConfig.isActive, true)).limit(1)
      if (!config) {
        return res.status(200).json({ model: 'gpt-4o', temperature: 0.3, systemPrompt: DEFAULT_SYSTEM_PROMPT })
      }
      return res.status(200).json({
        model: config.model,
        temperature: config.temperature,
        systemPrompt: config.systemPrompt,
      })
    } catch (err) {
      console.error('LLM config GET error:', err)
      return res.status(200).json({ model: 'gpt-4o', temperature: 0.3, systemPrompt: DEFAULT_SYSTEM_PROMPT })
    }
  }

  if (req.method === 'POST') {
    const auth = getAuthUser(req)
    if (!auth || auth.role !== 'admin') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs.' })
    }

    const { model, temperature, systemPrompt } = req.body

    try {
      await db.update(schema.llmConfig).set({ isActive: false }).where(eq(schema.llmConfig.isActive, true))

      const [config] = await db.insert(schema.llmConfig).values({
        model: model || 'gpt-4o',
        temperature: temperature ?? 0.3,
        systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        isActive: true,
        updatedBy: auth.userId,
      }).returning()

      return res.status(200).json({
        success: true,
        config: { model: config.model, temperature: config.temperature, systemPrompt: config.systemPrompt },
      })
    } catch (err) {
      console.error('LLM config POST error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleUsers(req: VercelRequest, res: VercelResponse) {
  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })
  if (auth.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs.' })

  if (req.method === 'GET') {
    try {
      const allUsers = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          blocked: schema.users.blocked,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .orderBy(schema.users.createdAt)

      return res.status(200).json(allUsers)
    } catch (err) {
      console.error('Admin users GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'PATCH') {
    const { userId, role, blocked } = req.body

    if (!userId) return res.status(400).json({ error: 'userId est requis.' })

    if (userId === auth.userId && role && role !== 'admin') {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre propre rôle admin.' })
    }
    if (userId === auth.userId && blocked === true) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous bloquer vous-même.' })
    }

    try {
      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (role !== undefined) updates.role = role
      if (blocked !== undefined) updates.blocked = blocked

      const [updated] = await db
        .update(schema.users)
        .set(updates)
        .where(eq(schema.users.id, userId))
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          blocked: schema.users.blocked,
        })

      if (!updated) return res.status(404).json({ error: 'Utilisateur non trouvé.' })

      return res.status(200).json(updated)
    } catch (err) {
      console.error('Admin users PATCH error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
