/**
 * Documents API — CRUD for document tracking
 * Requires authentication.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

/** Get or create user's family. */
async function getFamilyId(userId: string): Promise<string | null> {
  const [family] = await db
    .select({ id: schema.families.id })
    .from(schema.families)
    .where(eq(schema.families.ownerId, userId))
    .limit(1)
  return family?.id || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  const familyId = await getFamilyId(auth.userId)
  if (!familyId) return res.status(400).json({ error: 'Aucune famille trouvée. Créez d\'abord un bien dans Patrimoine.' })

  // GET — list all documents for this family
  if (req.method === 'GET') {
    try {
      const docs = await db
        .select()
        .from(schema.documents)
        .where(eq(schema.documents.familyId, familyId))
        .orderBy(schema.documents.createdAt)
      return res.status(200).json(docs)
    } catch (err) {
      console.error('Documents GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // POST — create a document
  if (req.method === 'POST') {
    const { name, category, status, notes } = req.body
    if (!name || !category) {
      return res.status(400).json({ error: 'Nom et catégorie requis.' })
    }
    try {
      const [doc] = await db
        .insert(schema.documents)
        .values({
          familyId,
          name,
          category,
          status: status || 'a_fournir',
          notes: notes || null,
          uploadedBy: auth.userId,
        })
        .returning()
      return res.status(201).json(doc)
    } catch (err) {
      console.error('Documents POST error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // PUT — update a document
  if (req.method === 'PUT') {
    const { id, name, category, status, notes } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis.' })
    try {
      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (name !== undefined) updates.name = name
      if (category !== undefined) updates.category = category
      if (status !== undefined) updates.status = status
      if (notes !== undefined) updates.notes = notes

      const [updated] = await db
        .update(schema.documents)
        .set(updates)
        .where(and(eq(schema.documents.id, id), eq(schema.documents.familyId, familyId)))
        .returning()

      if (!updated) return res.status(404).json({ error: 'Document non trouvé.' })
      return res.status(200).json(updated)
    } catch (err) {
      console.error('Documents PUT error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // DELETE — remove a document
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis.' })
    try {
      await db
        .delete(schema.documents)
        .where(and(eq(schema.documents.id, id), eq(schema.documents.familyId, familyId)))
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Documents DELETE error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
