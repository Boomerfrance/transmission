import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db'
import { signToken } from '../_lib/auth'
import { handleCors } from '../_lib/cors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis.' })
  }

  try {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }

    // Get user's family
    const [family] = await db
      .select({ id: schema.families.id })
      .from(schema.families)
      .where(eq(schema.families.ownerId, user.id))
      .limit(1)

    const token = signToken({ userId: user.id, email: user.email, role: user.role })

    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      familyId: family?.id || null,
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Erreur serveur. Réessayez plus tard.' })
  }
}
