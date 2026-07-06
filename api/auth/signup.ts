import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { signToken } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe sont requis.' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' })
  }

  try {
    // Check if user already exists
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' })
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await db
      .insert(schema.users)
      .values({ name, email, passwordHash, role: 'user' })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role })

    // Create a default family for the user
    const [family] = await db
      .insert(schema.families)
      .values({ name: `Famille ${name.split(' ').pop() || name}`, ownerId: user.id })
      .returning({ id: schema.families.id })

    const token = signToken({ userId: user.id, email: user.email, role: user.role })

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      familyId: family.id,
    })
  } catch (err) {
    console.error('Signup error:', err)
    return res.status(500).json({ error: 'Erreur serveur. Réessayez plus tard.' })
  }
}
