/**
 * JWT auth helpers for Vercel serverless functions.
 * Supports both legacy custom JWT and Auth0 ID token verification.
 */

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import type { VercelRequest } from '@vercel/node'

const JWT_SECRET = process.env.JWT_SECRET || 'transmission-dev-secret'
// Auth0 domain and client ID are public identifiers (not secrets). We fall back
// to the same values the frontend uses (see src/main.tsx) so token verification
// works even when the AUTH0_* env vars are not set on the backend.
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'icfg-brjd2g4anznlytomhw6ogwig.us.auth0.com'
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || '5LLCbqAdnnzYsgtvMKvTbOQmR7qUrqXh'

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

// ── Auth0 ID Token Verification ───────────────────────

export interface Auth0UserInfo {
  sub: string
  email: string
  name: string
}

let cachedJwks: any = null
let jwksCachedAt = 0
const JWKS_CACHE_MS = 60 * 60 * 1000 // 1 hour

async function getJwks() {
  if (cachedJwks && Date.now() - jwksCachedAt < JWKS_CACHE_MS) return cachedJwks
  const res = await fetch(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`)
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`)
  cachedJwks = await res.json()
  jwksCachedAt = Date.now()
  return cachedJwks
}

/**
 * Verify an Auth0 ID token using JWKS.
 * Returns the user info from the token payload.
 */
export async function verifyAuth0Token(idToken: string): Promise<Auth0UserInfo> {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    throw new Error('Auth0 not configured (AUTH0_DOMAIN / AUTH0_CLIENT_ID missing)')
  }

  // Decode header to get the key ID (kid)
  const decoded = jwt.decode(idToken, { complete: true })
  if (!decoded || !decoded.header.kid) {
    throw new Error('Invalid token: cannot decode header')
  }

  // Fetch the JWKS and find the matching key
  const jwks = await getJwks()
  const jwk = jwks.keys?.find((k: any) => k.kid === decoded.header.kid)
  if (!jwk) throw new Error('Signing key not found in JWKS')

  // Convert JWK to PEM using Node.js crypto
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string

  // Verify the token signature, audience, issuer, and expiration
  const payload = jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    audience: AUTH0_CLIENT_ID,
    issuer: `https://${AUTH0_DOMAIN}/`,
  }) as any

  if (!payload.email) {
    throw new Error('Token does not contain an email claim')
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || payload.nickname || payload.email.split('@')[0],
  }
}
