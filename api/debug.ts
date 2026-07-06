import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const errors: string[] = []
  
  // Test 1: env vars
  try {
    if (!process.env.DATABASE_URL) errors.push('DATABASE_URL not set')
    if (!process.env.JWT_SECRET) errors.push('JWT_SECRET not set')
  } catch (e: any) {
    errors.push(`env check: ${e.message}`)
  }

  // Test 2: neon import
  try {
    const { neon } = await import('@neondatabase/serverless')
    if (neon) errors.push('neon: OK')
  } catch (e: any) {
    errors.push(`neon import: ${e.message}`)
  }

  // Test 3: drizzle import
  try {
    const { drizzle } = await import('drizzle-orm/neon-http')
    if (drizzle) errors.push('drizzle: OK')
  } catch (e: any) {
    errors.push(`drizzle import: ${e.message}`)
  }

  // Test 4: bcryptjs import
  try {
    const bcrypt = await import('bcryptjs')
    if (bcrypt) errors.push('bcryptjs: OK')
  } catch (e: any) {
    errors.push(`bcryptjs import: ${e.message}`)
  }

  // Test 5: jsonwebtoken import
  try {
    const jwt = await import('jsonwebtoken')
    if (jwt) errors.push('jsonwebtoken: OK')
  } catch (e: any) {
    errors.push(`jsonwebtoken import: ${e.message}`)
  }

  // Test 6: schema import
  try {
    const schema = await import('../src/lib/db/schema')
    if (schema) errors.push(`schema: OK (keys: ${Object.keys(schema).join(',')})`)
  } catch (e: any) {
    errors.push(`schema import: ${e.message}`)
  }

  // Test 7: db module import
  try {
    const dbMod = await import('./_lib/db')
    if (dbMod) errors.push('db module: OK')
  } catch (e: any) {
    errors.push(`db module import: ${e.message}`)
  }

  // Test 8: db query
  try {
    const { db, schema } = await import('./_lib/db')
    const result = await db.select({ id: schema.users.id }).from(schema.users).limit(1)
    errors.push(`db query: OK (${result.length} users)`)
  } catch (e: any) {
    errors.push(`db query: ${e.message}`)
  }

  return res.status(200).json({ checks: errors })
}
