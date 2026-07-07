import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, desc } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  try {
    // GET — list published articles (public) or all articles (admin)
    if (req.method === 'GET') {
      const auth = getAuthUser(req)
      const isAdmin = auth?.role === 'admin'

      let articles
      if (isAdmin && req.query.all === 'true') {
        articles = await db
          .select({
            id: schema.blogArticles.id,
            slug: schema.blogArticles.slug,
            title: schema.blogArticles.title,
            summary: schema.blogArticles.summary,
            category: schema.blogArticles.category,
            published: schema.blogArticles.published,
            authorName: schema.blogArticles.authorName,
            createdAt: schema.blogArticles.createdAt,
            updatedAt: schema.blogArticles.updatedAt,
          })
          .from(schema.blogArticles)
          .orderBy(desc(schema.blogArticles.createdAt))
      } else {
        articles = await db
          .select({
            id: schema.blogArticles.id,
            slug: schema.blogArticles.slug,
            title: schema.blogArticles.title,
            summary: schema.blogArticles.summary,
            category: schema.blogArticles.category,
            published: schema.blogArticles.published,
            authorName: schema.blogArticles.authorName,
            createdAt: schema.blogArticles.createdAt,
          })
          .from(schema.blogArticles)
          .where(eq(schema.blogArticles.published, true))
          .orderBy(desc(schema.blogArticles.createdAt))
      }

      return res.status(200).json(articles)
    }

    // POST — create article (admin only)
    if (req.method === 'POST') {
      const auth = getAuthUser(req)
      if (!auth || auth.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs.' })
      }

      const { title, slug, summary, content, category, published, authorName } = req.body
      if (!title || !slug || !summary || !content || !category) {
        return res.status(400).json({ error: 'title, slug, summary, content et category sont requis.' })
      }

      const [article] = await db.insert(schema.blogArticles).values({
        title,
        slug,
        summary,
        content,
        category,
        published: published ?? false,
        authorName: authorName || 'Transmission',
      }).returning()

      return res.status(201).json(article)
    }

    // PUT — update article (admin only)
    if (req.method === 'PUT') {
      const auth = getAuthUser(req)
      if (!auth || auth.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs.' })
      }

      const { id, ...updates } = req.body
      if (!id) return res.status(400).json({ error: 'id est requis.' })

      const allowedFields: Record<string, any> = {}
      for (const key of ['title', 'slug', 'summary', 'content', 'category', 'published', 'authorName']) {
        if (updates[key] !== undefined) allowedFields[key] = updates[key]
      }
      allowedFields.updatedAt = new Date()

      const [updated] = await db
        .update(schema.blogArticles)
        .set(allowedFields)
        .where(eq(schema.blogArticles.id, id))
        .returning()

      return res.status(200).json(updated)
    }

    // DELETE — remove article (admin only)
    if (req.method === 'DELETE') {
      const auth = getAuthUser(req)
      if (!auth || auth.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs.' })
      }

      const { id } = req.body || req.query
      if (!id) return res.status(400).json({ error: 'id est requis.' })

      await db.delete(schema.blogArticles).where(eq(schema.blogArticles.id, id as string))
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Blog error:', err)
    return res.status(500).json({ error: 'Erreur serveur.' })
  }
}
