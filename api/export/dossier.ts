/**
 * Export Dossier API — Aggregates all data for PDF generation
 * Returns: patrimony, canvas, checklist, documents, family info
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  try {
    // Get user info
    const [user] = await db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, auth.userId))
      .limit(1)

    // Get family
    const [family] = await db
      .select()
      .from(schema.families)
      .where(eq(schema.families.ownerId, auth.userId))
      .limit(1)

    if (!family) {
      return res.status(400).json({ error: 'Aucune famille trouvée.' })
    }

    // Fetch all data in parallel
    const [assetsList, canvasList, checklistList, documentsList] = await Promise.all([
      db.select().from(schema.assets).where(eq(schema.assets.familyId, family.id)).orderBy(schema.assets.category),
      db.select().from(schema.canvasAnswers).where(eq(schema.canvasAnswers.familyId, family.id)),
      db.select().from(schema.checklistItems).where(eq(schema.checklistItems.familyId, family.id)).orderBy(schema.checklistItems.sortOrder),
      db.select().from(schema.documents).where(eq(schema.documents.familyId, family.id)).orderBy(schema.documents.category),
    ])

    // Compute totals
    const totalPatrimoine = assetsList.reduce((sum, a) => sum + parseFloat(a.value as string), 0)
    const checklistDone = checklistList.filter((c) => c.isCompleted).length
    const checklistTotal = checklistList.length
    const docsObtenu = documentsList.filter((d) => d.status === 'obtenu').length
    const docsTotal = documentsList.length

    return res.status(200).json({
      user: { name: user.name, email: user.email },
      family: { id: family.id, name: family.name },
      patrimoine: {
        assets: assetsList,
        total: totalPatrimoine,
      },
      canvas: canvasList,
      checklist: {
        items: checklistList,
        completed: checklistDone,
        total: checklistTotal,
        progress: checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0,
      },
      documents: {
        items: documentsList,
        obtained: docsObtenu,
        total: docsTotal,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Export dossier error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
