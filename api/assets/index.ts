import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db'
import { getAuthUser } from '../_lib/auth'
import { handleCors } from '../_lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  // Get user's family
  const [family] = await db.select({ id: schema.families.id }).from(schema.families).where(eq(schema.families.ownerId, auth.userId)).limit(1)
  if (!family) return res.status(404).json({ error: 'Famille introuvable.' })

  try {
    // GET — list assets
    if (req.method === 'GET') {
      const items = await db.select().from(schema.assets).where(eq(schema.assets.familyId, family.id))
      return res.status(200).json(items)
    }

    // POST — create asset
    if (req.method === 'POST') {
      const { category, label, value, notes } = req.body
      if (!category || !label || value === undefined) {
        return res.status(400).json({ error: 'category, label et value sont requis.' })
      }
      const [asset] = await db.insert(schema.assets).values({ familyId: family.id, category, label, value: String(value), notes: notes || null }).returning()
      return res.status(201).json(asset)
    }

    // PUT — update asset
    if (req.method === 'PUT') {
      const { id, category, label, value, notes } = req.body
      if (!id) return res.status(400).json({ error: 'id est requis.' })
      const [updated] = await db.update(schema.assets).set({
        ...(category && { category }),
        ...(label && { label }),
        ...(value !== undefined && { value: String(value) }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      }).where(eq(schema.assets.id, id)).returning()
      return res.status(200).json(updated)
    }

    // DELETE — remove asset
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query
      if (!id) return res.status(400).json({ error: 'id est requis.' })
      await db.delete(schema.assets).where(eq(schema.assets.id, id as string))
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Assets error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
