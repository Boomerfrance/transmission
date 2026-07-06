import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  const [family] = await db.select({ id: schema.families.id }).from(schema.families).where(eq(schema.families.ownerId, auth.userId)).limit(1)
  if (!family) return res.status(404).json({ error: 'Famille introuvable.' })

  try {
    // GET — list all answers for this family
    if (req.method === 'GET') {
      const answers = await db.select().from(schema.canvasAnswers).where(eq(schema.canvasAnswers.familyId, family.id))
      return res.status(200).json(answers)
    }

    // POST — save/update an answer
    if (req.method === 'POST') {
      const { sectionId, questionId, answer } = req.body
      if (!sectionId || !questionId || answer === undefined) {
        return res.status(400).json({ error: 'sectionId, questionId et answer sont requis.' })
      }

      // Upsert: check if answer exists
      const [existing] = await db.select().from(schema.canvasAnswers).where(
        and(
          eq(schema.canvasAnswers.familyId, family.id),
          eq(schema.canvasAnswers.sectionId, sectionId),
          eq(schema.canvasAnswers.questionId, questionId)
        )
      ).limit(1)

      if (existing) {
        const [updated] = await db.update(schema.canvasAnswers).set({ answer, updatedAt: new Date() }).where(eq(schema.canvasAnswers.id, existing.id)).returning()
        return res.status(200).json(updated)
      }

      const [created] = await db.insert(schema.canvasAnswers).values({
        familyId: family.id,
        sectionId,
        questionId,
        answer,
        answeredBy: auth.userId,
      }).returning()
      return res.status(201).json(created)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Canvas error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
