import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { slug } = req.query
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'slug est requis.' })
    }

    const auth = getAuthUser(req)
    const isAdmin = auth?.role === 'admin'

    // Admin can view unpublished articles
    const conditions = isAdmin
      ? eq(schema.blogArticles.slug, slug)
      : and(eq(schema.blogArticles.slug, slug), eq(schema.blogArticles.published, true))

    const [article] = await db
      .select()
      .from(schema.blogArticles)
      .where(conditions!)
      .limit(1)

    if (!article) {
      return res.status(404).json({ error: 'Article introuvable.' })
    }

    return res.status(200).json(article)
  } catch (err) {
    console.error('Blog slug error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
