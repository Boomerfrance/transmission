/**
 * Checklist API — CRUD + toggle for preparation checklist
 * Requires authentication. Seeds default items on first GET.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

/** Default checklist items for French patrimony transmission. */
const DEFAULT_ITEMS = [
  // Documents
  { title: 'Rassembler les pièces d\'identité de tous les membres', category: 'documents', sortOrder: 1, description: 'CNI, passeports, livret de famille.' },
  { title: 'Obtenir un extrait d\'acte de naissance récent', category: 'documents', sortOrder: 2, description: 'Moins de 3 mois, pour chaque membre concerné.' },
  { title: 'Réunir les actes de propriété immobilière', category: 'documents', sortOrder: 3, description: 'Titres de propriété, actes notariés d\'acquisition.' },
  { title: 'Collecter les relevés de comptes bancaires', category: 'documents', sortOrder: 4, description: 'Comptes courants, livrets, PEA, assurance-vie.' },
  { title: 'Rassembler les contrats d\'assurance-vie', category: 'documents', sortOrder: 5, description: 'Avec les clauses bénéficiaires.' },

  // Patrimoine
  { title: 'Inventorier tous les biens immobiliers', category: 'patrimoine', sortOrder: 10, description: 'Résidence principale, secondaire, locatif, terrains.' },
  { title: 'Lister les placements financiers', category: 'patrimoine', sortOrder: 11, description: 'Épargne, actions, obligations, crypto-actifs.' },
  { title: 'Évaluer les biens professionnels', category: 'patrimoine', sortOrder: 12, description: 'Parts sociales, fonds de commerce, brevets.' },
  { title: 'Recenser les dettes et emprunts en cours', category: 'patrimoine', sortOrder: 13, description: 'Crédits immobiliers, prêts personnels.' },

  // Famille
  { title: 'Compléter le Canvas Familial', category: 'famille', sortOrder: 20, description: 'Répondre à toutes les questions du questionnaire familial.' },
  { title: 'Discuter des souhaits de transmission en famille', category: 'famille', sortOrder: 21, description: 'Organiser une réunion familiale sur le sujet.' },
  { title: 'Identifier les bénéficiaires et leurs besoins', category: 'famille', sortOrder: 22, description: 'Enfants, petits-enfants, conjoint, autres.' },

  // Juridique & Fiscal
  { title: 'Vérifier l\'existence d\'un testament', category: 'juridique', sortOrder: 30, description: 'Testament olographe ou authentique.' },
  { title: 'Vérifier le régime matrimonial', category: 'juridique', sortOrder: 31, description: 'Communauté, séparation de biens, participation aux acquêts.' },
  { title: 'Simuler les droits de succession', category: 'fiscal', sortOrder: 40, description: 'Utiliser le simulateur fiscal de Transmission.' },
  { title: 'Prendre rendez-vous avec un notaire', category: 'juridique', sortOrder: 50, description: 'Pour valider le dossier et officialiser les choix.' },
]

async function getFamilyId(userId: string): Promise<string | null> {
  const [family] = await db
    .select({ id: schema.families.id })
    .from(schema.families)
    .where(eq(schema.families.ownerId, userId))
    .limit(1)
  return family?.id || null
}

/** Seed default checklist items if none exist for this family. */
async function seedDefaults(familyId: string) {
  const existing = await db
    .select({ id: schema.checklistItems.id })
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.familyId, familyId))
    .limit(1)

  if (existing.length > 0) return // Already seeded

  await db.insert(schema.checklistItems).values(
    DEFAULT_ITEMS.map((item) => ({
      familyId,
      title: item.title,
      description: item.description,
      category: item.category,
      sortOrder: item.sortOrder,
      isDefault: true,
      isCompleted: false,
    }))
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  const familyId = await getFamilyId(auth.userId)
  if (!familyId) return res.status(400).json({ error: 'Aucune famille trouvée.' })

  // GET — list all checklist items (seeds defaults on first visit)
  if (req.method === 'GET') {
    try {
      await seedDefaults(familyId)

      const items = await db
        .select()
        .from(schema.checklistItems)
        .where(eq(schema.checklistItems.familyId, familyId))
        .orderBy(schema.checklistItems.sortOrder)

      return res.status(200).json(items)
    } catch (err) {
      console.error('Checklist GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // POST — create a custom checklist item
  if (req.method === 'POST') {
    const { title, description, category } = req.body
    if (!title || !category) {
      return res.status(400).json({ error: 'Titre et catégorie requis.' })
    }
    try {
      const [item] = await db
        .insert(schema.checklistItems)
        .values({
          familyId,
          title,
          description: description || null,
          category,
          isDefault: false,
          isCompleted: false,
          sortOrder: 99,
        })
        .returning()
      return res.status(201).json(item)
    } catch (err) {
      console.error('Checklist POST error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // PATCH — toggle completion or update item
  if (req.method === 'PATCH') {
    const { id, isCompleted, title, description, category } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis.' })
    try {
      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (isCompleted !== undefined) {
        updates.isCompleted = isCompleted
        updates.completedAt = isCompleted ? new Date() : null
        updates.completedBy = isCompleted ? auth.userId : null
      }
      if (title !== undefined) updates.title = title
      if (description !== undefined) updates.description = description
      if (category !== undefined) updates.category = category

      const [updated] = await db
        .update(schema.checklistItems)
        .set(updates)
        .where(and(eq(schema.checklistItems.id, id), eq(schema.checklistItems.familyId, familyId)))
        .returning()

      if (!updated) return res.status(404).json({ error: 'Élément non trouvé.' })
      return res.status(200).json(updated)
    } catch (err) {
      console.error('Checklist PATCH error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // DELETE — remove a custom checklist item
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID requis.' })
    try {
      await db
        .delete(schema.checklistItems)
        .where(and(eq(schema.checklistItems.id, id), eq(schema.checklistItems.familyId, familyId)))
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Checklist DELETE error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
