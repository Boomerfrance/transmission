/**
 * Admin Users API — GET list all users, PATCH update role/blocked status
 * Only accessible by admin users.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

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

    // Prevent admin from demoting themselves
    if (userId === auth.userId && role && role !== 'admin') {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre propre rôle admin.' })
    }

    // Prevent admin from blocking themselves
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
