/**
 * Consolidated Auth API
 * GET  /api/auth         — Get current user (me)
 * POST /api/auth?action=login  — Login
 * POST /api/auth?action=signup — Signup
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { signToken, getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  // GET = me
  if (req.method === 'GET') {
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const action = req.query.action as string

  // POST action=signup
  if (action === 'signup') {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe sont requis.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' })
    }

    try {
      const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Un compte avec cet email existe déjà.' })
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const [user] = await db
        .insert(schema.users)
        .values({ name, email, passwordHash, role: 'user' })
        .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role })

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

  // POST action=login (default)
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

    if (user.blocked) {
      return res.status(403).json({ error: 'Votre compte a été bloqué. Contactez un administrateur.' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }

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
