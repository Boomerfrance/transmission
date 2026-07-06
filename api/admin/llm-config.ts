import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * GET  /api/admin/llm-config — Get current LLM configuration
 * POST /api/admin/llm-config — Update LLM configuration (admin only)
 *
 * The 3 configurable parameters:
 * 1. model       — Which LLM model to use (e.g. gpt-4o, claude-sonnet-4-20250514)
 * 2. temperature — Creativity/determinism slider (0.0 to 1.0)
 * 3. systemPrompt — The system instructions that shape the assistant's behavior
 */

// Placeholder — will connect to Neon DB
const currentConfig = {
  model: 'gpt-4o',
  temperature: 0.3,
  systemPrompt: `Tu es l'assistant IA de Transmission, une plateforme de gouvernance familiale patrimoniale.

Ton rôle :
- Aider les familles à comprendre les enjeux de la transmission patrimoniale en France
- Fournir des informations générales sur la fiscalité successorale
- Guider dans la préparation du dossier pour le notaire
- Faciliter le dialogue familial autour de la transmission

Règles :
- Information générale uniquement, jamais de conseil juridique personnalisé
- Recommander systématiquement un notaire ou CGP
- Communiquer en français, ton professionnel et accessible`,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(currentConfig)
  }

  if (req.method === 'POST') {
    // TODO: Auth check (admin only)
    // TODO: Save to Neon DB
    const { model, temperature, systemPrompt } = req.body

    if (model) currentConfig.model = model
    if (temperature !== undefined) currentConfig.temperature = temperature
    if (systemPrompt) currentConfig.systemPrompt = systemPrompt

    return res.status(200).json({ success: true, config: currentConfig })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
