import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: string[] = []
  
  try {
    if (!process.env.DATABASE_URL) checks.push('DATABASE_URL not set')
    else checks.push('DATABASE_URL: set')
    if (!process.env.JWT_SECRET) checks.push('JWT_SECRET not set')
    else checks.push('JWT_SECRET: set')
  } catch (e: any) {
    checks.push(`env: ${e.message}`)
  }

  try {
    const { db, schema } = await import('./_lib/db.js')
    const result = await db.select({ id: schema.users.id }).from(schema.users).limit(1)
    checks.push(`db: OK (${result.length} users found)`)
  } catch (e: any) {
    checks.push(`db: ${e.message}`)
  }

  try {
    const { signToken } = await import('./_lib/auth.js')
    const token = signToken({ userId: 'test', email: 'test@test.com', role: 'user' })
    checks.push(`auth: OK (token length ${token.length})`)
  } catch (e: any) {
    checks.push(`auth: ${e.message}`)
  }

  return res.status(200).json({ checks })
}
