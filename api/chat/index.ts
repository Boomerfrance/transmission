import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'message est requis.' })

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'placeholder') {
    return res.status(503).json({ error: "L'assistant IA n'est pas encore configuré. Ajoutez la clé API OpenRouter." })
  }

  try {
    // Get active LLM config
    const [config] = await db.select().from(schema.llmConfig).where(eq(schema.llmConfig.isActive, true)).limit(1)

    const model = config?.model || 'gpt-4o'
    const temperature = config?.temperature ?? 0.3
    const systemPrompt = config?.systemPrompt || "Tu es l'assistant IA de Transmission, une plateforme de gouvernance familiale patrimoniale."

    const openrouterModel = MODEL_MAP[model] || `openai/${model}`

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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
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

    return res.status(200).json({
      reply,
      model: openrouterModel,
      usage: data.usage || null,
    })
  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
