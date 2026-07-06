/**
 * JWT auth helpers for Vercel serverless functions.
 */

import jwt from 'jsonwebtoken'
import type { VercelRequest } from '@vercel/node'

const JWT_SECRET = process.env.JWT_SECRET || 'transmission-dev-secret'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

/**
 * Extract and verify the JWT from the Authorization header.
 * Returns null if missing or invalid.
 */
export function getAuthUser(req: VercelRequest): JwtPayload | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    return verifyToken(header.slice(7))
  } catch {
    return null
  }
}

/**
 * Guard: require authentication. Returns user or sends 401.
 */
export function requireAuth(req: VercelRequest): JwtPayload | null {
  const user = getAuthUser(req)
  return user
}
