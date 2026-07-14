/**
 * Consolidated Auth API
 * GET  /api/auth                    — Get current user (me)
 * POST /api/auth?action=login       — Login
 * POST /api/auth?action=signup      — Signup
 * POST /api/auth?action=forgot      — Request password reset
 * POST /api/auth?action=reset       — Reset password with token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { signToken, getAuthUser, verifyAuth0Token } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'
import { sendPasswordResetEmail } from '../_lib/email.js'

const JWT_SECRET = process.env.JWT_SECRET || 'transmission-dev-secret'
const APP_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'

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

  // POST action=auth0-login — Login via Auth0 ID token
  if (action === 'auth0-login') {
    const { idToken } = req.body
    if (!idToken) return res.status(400).json({ error: 'ID token requis.' })

    try {
      const auth0User = await verifyAuth0Token(idToken)

      // Find existing user by email
      let [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, auth0User.email))
        .limit(1)

      if (!user) {
        // Create new user (passwordHash is a placeholder — Auth0 handles auth)
        const [newUser] = await db
          .insert(schema.users)
          .values({
            name: auth0User.name,
            email: auth0User.email,
            passwordHash: `AUTH0:${auth0User.sub}`,
            role: 'user',
          })
          .returning()
        user = newUser

        // Create a family for the new user
        await db.insert(schema.families).values({
          name: `Famille ${auth0User.name.split(' ').pop() || auth0User.name}`,
          ownerId: user.id,
        })
      }

      // Get family
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
      console.error('Auth0 login error:', err)
      return res.status(401).json({ error: 'Authentification Auth0 échouée.' })
    }
  }

  // POST action=forgot — request password reset
  if (action === 'forgot') {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email requis.' })

    try {
      const [user] = await db
        .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1)

      // Always return success (don't reveal if email exists)
      if (!user) {
        return res.status(200).json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' })
      }

      // Generate a short-lived reset token (1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, purpose: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      )

      const resetLink = `${APP_URL}/reinitialiser-mot-de-passe?token=${resetToken}`

      // Send reset email (falls back to console.log if RESEND_API_KEY not set)
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl: resetLink,
        userName: user.name,
      })

      return res.status(200).json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      })
    } catch (err) {
      console.error('Forgot password error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  // POST action=reset — reset password with token
  if (action === 'reset') {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis.' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères.' })
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; purpose: string }
      if (payload.purpose !== 'password_reset') {
        return res.status(400).json({ error: 'Token invalide.' })
      }

      const passwordHash = await bcrypt.hash(newPassword, 12)
      await db
        .update(schema.users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(schema.users.id, payload.userId))

      return res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès.' })
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'Le lien a expiré. Demandez un nouveau lien de réinitialisation.' })
      }
      if (err?.name === 'JsonWebTokenError') {
        return res.status(400).json({ error: 'Lien invalide.' })
      }
      console.error('Reset password error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
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
