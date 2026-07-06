import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

/**
 * GET  /api/admin/llm-config — Get current LLM configuration
 * POST /api/admin/llm-config — Update LLM configuration (admin only)
 *
 * The 3 configurable parameters:
 * 1. model       — Which LLM model to use
 * 2. temperature — Creativity slider (0.0 to 1.0)
 * 3. systemPrompt — System instructions
 */

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
      // Deactivate all existing configs
      await db.update(schema.llmConfig).set({ isActive: false }).where(eq(schema.llmConfig.isActive, true))

      // Insert new active config
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
