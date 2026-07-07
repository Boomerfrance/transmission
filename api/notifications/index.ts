/**
 * Notifications API
 * GET    /api/notifications          — List user's notifications
 * GET    /api/notifications?unread=1 — Count unread
 * PATCH  /api/notifications          — Mark as read (single or all)
 * DELETE /api/notifications          — Delete notification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and, desc } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  if (req.method === 'GET') {
    try {
      const unreadOnly = req.query.unread === '1'

      if (unreadOnly) {
        const unread = await db
          .select()
          .from(schema.notifications)
          .where(and(eq(schema.notifications.userId, auth.userId), eq(schema.notifications.isRead, false)))

        return res.status(200).json({ count: unread.length })
      }

      const notifications = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, auth.userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50)

      return res.status(200).json(notifications)
    } catch (err) {
      console.error('Notifications GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'PATCH') {
    const { id, markAll } = req.body

    try {
      if (markAll) {
        await db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(and(eq(schema.notifications.userId, auth.userId), eq(schema.notifications.isRead, false)))

        return res.status(200).json({ success: true })
      }

      if (!id) return res.status(400).json({ error: 'id est requis.' })

      const [updated] = await db
        .update(schema.notifications)
        .set({ isRead: true })
        .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, auth.userId)))
        .returning()

      if (!updated) return res.status(404).json({ error: 'Notification non trouvée.' })
      return res.status(200).json(updated)
    } catch (err) {
      console.error('Notifications PATCH error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id est requis.' })

    try {
      await db
        .delete(schema.notifications)
        .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, auth.userId)))

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Notifications DELETE error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
