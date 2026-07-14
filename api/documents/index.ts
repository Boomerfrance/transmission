/**
 * Documents API — CRUD for document tracking + file upload
 * Requires authentication. Files stored as base64 in DB (max 2MB).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and, sql } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

// Auto-migrate: add file_data column if it doesn't exist
let migrated = false
async function ensureFileDataColumn() {
  if (migrated) return
  try {
    await db.execute(sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data TEXT`)
    migrated = true
  } catch { migrated = true }
}

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

  await ensureFileDataColumn()

  const familyId = await getFamilyId(auth.userId)
  if (!familyId) return res.status(400).json({ error: 'Aucune famille trouvée. Créez d\'abord un bien dans Patrimoine.' })

  // GET — list all documents for this family (or download one file)
  if (req.method === 'GET') {
    const downloadId = req.query.download as string
    try {
      if (downloadId) {
        // Download a specific file
        const [doc] = await db
          .select()
          .from(schema.documents)
          .where(and(eq(schema.documents.id, downloadId), eq(schema.documents.familyId, familyId)))
          .limit(1)
        if (!doc || !doc.fileData) return res.status(404).json({ error: 'Fichier introuvable.' })
        return res.status(200).json({ fileName: doc.fileName, fileType: doc.fileType, fileData: doc.fileData })
      }

      // List all (without file content)
      const docs = await db
        .select({
          id: schema.documents.id,
          familyId: schema.documents.familyId,
          name: schema.documents.name,
          category: schema.documents.category,
          status: schema.documents.status,
          notes: schema.documents.notes,
          fileName: schema.documents.fileName,
          fileType: schema.documents.fileType,
          fileSize: schema.documents.fileSize,
          uploadedBy: schema.documents.uploadedBy,
          createdAt: schema.documents.createdAt,
          updatedAt: schema.documents.updatedAt,
        })
        .from(schema.documents)
        .where(eq(schema.documents.familyId, familyId))
        .orderBy(schema.documents.createdAt)
      return res.status(200).json(docs)
    } catch (err) {
      console.error('Documents GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // POST — create a document (optionally with file)
  if (req.method === 'POST') {
    const { name, category, status, notes, fileName, fileType, fileSize, fileData } = req.body
    if (!name || !category) {
      return res.status(400).json({ error: 'Nom et catégorie requis.' })
    }
    // Validate file size (max 2MB base64 ≈ 2.7MB string)
    if (fileData && fileData.length > 3_000_000) {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 2 Mo).' })
    }
    try {
      const [doc] = await db
        .insert(schema.documents)
        .values({
          familyId,
          name,
          category,
          status: status || (fileData ? 'obtenu' : 'a_fournir'),
          notes: notes || null,
          fileName: fileName || null,
          fileType: fileType || null,
          fileSize: fileSize || null,
          fileData: fileData || null,
          uploadedBy: auth.userId,
        })
        .returning()
      // Don't send fileData back in list responses (too large)
      return res.status(201).json({ ...doc, fileData: doc.fileData ? '[uploaded]' : null })
    } catch (err) {
      console.error('Documents POST error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // PUT — update a document (optionally with file)
  if (req.method === 'PUT') {
    const { id, name, category, status, notes, fileName, fileType, fileSize, fileData } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis.' })
    if (fileData && fileData.length > 3_000_000) {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 2 Mo).' })
    }
    try {
      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (name !== undefined) updates.name = name
      if (category !== undefined) updates.category = category
      if (status !== undefined) updates.status = status
      if (notes !== undefined) updates.notes = notes
      if (fileName !== undefined) updates.fileName = fileName
      if (fileType !== undefined) updates.fileType = fileType
      if (fileSize !== undefined) updates.fileSize = fileSize
      if (fileData !== undefined) updates.fileData = fileData

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
