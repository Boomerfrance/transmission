import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db'
import { getAuthUser } from '../_lib/auth'
import { handleCors } from '../_lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  try {
    const [user] = await db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, auth.userId))
      .limit(1)

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' })

    const [family] = await db
      .select({ id: schema.families.id, name: schema.families.name })
      .from(schema.families)
      .where(eq(schema.families.ownerId, user.id))
      .limit(1)

    return res.status(200).json({ user, family: family || null })
  } catch (err) {
    console.error('Me error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
