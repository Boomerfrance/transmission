/**
 * Family API — Members CRUD + Invitations
 * 
 * Members:
 *   GET    /api/family              — List family members
 *   POST   /api/family              — Add member
 *   PUT    /api/family              — Update member
 *   DELETE /api/family              — Delete member
 * 
 * Invitations (via ?section=invitations):
 *   GET    /api/family?section=invitations            — List invitations
 *   POST   /api/family?section=invitations            — Create invitation
 *   POST   /api/family?section=invitations&action=accept  — Accept invitation
 *   PATCH  /api/family?section=invitations            — Cancel/decline invitation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../_lib/db.js'
import { getAuthUser } from '../_lib/auth.js'
import { handleCors } from '../_lib/cors.js'
import crypto from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return

  const auth = getAuthUser(req)
  if (!auth) return res.status(401).json({ error: 'Non authentifié.' })

  const section = req.query.section as string

  if (section === 'invitations') {
    return handleInvitations(req, res, auth)
  }

  return handleMembers(req, res, auth)
}

async function getFamilyId(userId: string): Promise<string | null> {
  // Check family_access first, then fall back to owned families
  const [access] = await db
    .select({ familyId: schema.familyAccess.familyId })
    .from(schema.familyAccess)
    .where(eq(schema.familyAccess.userId, userId))
    .limit(1)
  
  if (access) return access.familyId

  const [family] = await db
    .select({ id: schema.families.id })
    .from(schema.families)
    .where(eq(schema.families.ownerId, userId))
    .limit(1)

  return family?.id || null
}

async function handleMembers(req: VercelRequest, res: VercelResponse, auth: { userId: string; email: string; role: string }) {
  const familyId = await getFamilyId(auth.userId)
  if (!familyId) return res.status(404).json({ error: 'Aucune famille trouvée.' })

  if (req.method === 'GET') {
    try {
      const members = await db
        .select()
        .from(schema.familyMembers)
        .where(eq(schema.familyMembers.familyId, familyId))
        .orderBy(schema.familyMembers.createdAt)

      return res.status(200).json(members)
    } catch (err) {
      console.error('Family members GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'POST') {
    const { name, relationship, birthYear, notes, parentId } = req.body
    if (!name || !relationship) {
      return res.status(400).json({ error: 'Nom et lien de parenté sont requis.' })
    }

    try {
      const [member] = await db
        .insert(schema.familyMembers)
        .values({ familyId, name, relationship, birthYear, notes, parentId: parentId || null })
        .returning()

      // Create notification for family members
      await createNotification(auth.userId, 'system', 'Membre ajouté', `${name} a été ajouté à l'arbre familial.`, '/arbre-familial')

      return res.status(201).json(member)
    } catch (err) {
      console.error('Family member POST error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'PUT') {
    const { id, name, relationship, birthYear, notes, parentId } = req.body
    if (!id) return res.status(400).json({ error: 'id est requis.' })

    try {
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (relationship !== undefined) updates.relationship = relationship
      if (birthYear !== undefined) updates.birthYear = birthYear
      if (notes !== undefined) updates.notes = notes
      if (parentId !== undefined) updates.parentId = parentId

      const [updated] = await db
        .update(schema.familyMembers)
        .set(updates)
        .where(and(eq(schema.familyMembers.id, id), eq(schema.familyMembers.familyId, familyId)))
        .returning()

      if (!updated) return res.status(404).json({ error: 'Membre non trouvé.' })
      return res.status(200).json(updated)
    } catch (err) {
      console.error('Family member PUT error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id est requis.' })

    try {
      // Clear parentId references to this member
      await db
        .update(schema.familyMembers)
        .set({ parentId: null })
        .where(and(eq(schema.familyMembers.parentId, id), eq(schema.familyMembers.familyId, familyId)))

      const [deleted] = await db
        .delete(schema.familyMembers)
        .where(and(eq(schema.familyMembers.id, id), eq(schema.familyMembers.familyId, familyId)))
        .returning()

      if (!deleted) return res.status(404).json({ error: 'Membre non trouvé.' })
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('Family member DELETE error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleInvitations(req: VercelRequest, res: VercelResponse, auth: { userId: string; email: string; role: string }) {
  if (req.method === 'GET') {
    try {
      // Get sent invitations (for family owner)
      const familyId = await getFamilyId(auth.userId)
      const sent = familyId
        ? await db.select().from(schema.invitations).where(eq(schema.invitations.familyId, familyId)).orderBy(schema.invitations.createdAt)
        : []

      // Get received invitations
      const received = await db
        .select()
        .from(schema.invitations)
        .where(and(eq(schema.invitations.inviteeEmail, auth.email), eq(schema.invitations.status, 'pending')))
        .orderBy(schema.invitations.createdAt)

      return res.status(200).json({ sent, received })
    } catch (err) {
      console.error('Invitations GET error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'POST') {
    const action = req.query.action as string

    // Accept invitation
    if (action === 'accept') {
      const { invitationId } = req.body
      if (!invitationId) return res.status(400).json({ error: 'invitationId requis.' })

      try {
        const [invitation] = await db
          .select()
          .from(schema.invitations)
          .where(and(
            eq(schema.invitations.id, invitationId),
            eq(schema.invitations.inviteeEmail, auth.email),
            eq(schema.invitations.status, 'pending')
          ))
          .limit(1)

        if (!invitation) return res.status(404).json({ error: 'Invitation non trouvée ou déjà traitée.' })

        // Update invitation
        await db
          .update(schema.invitations)
          .set({ status: 'accepted', acceptedBy: auth.userId, updatedAt: new Date() })
          .where(eq(schema.invitations.id, invitationId))

        // Grant family access
        await db.insert(schema.familyAccess).values({
          familyId: invitation.familyId,
          userId: auth.userId,
          role: invitation.role,
        })

        // Notify the inviter
        await createNotification(
          invitation.invitedBy,
          'invitation',
          'Invitation acceptée',
          `${auth.email} a rejoint votre espace familial.`,
          '/arbre-familial'
        )

        return res.status(200).json({ success: true, familyId: invitation.familyId })
      } catch (err) {
        console.error('Accept invitation error:', err)
        return res.status(500).json({ error: 'Erreur serveur.' })
      }
    }

    // Create invitation
    const { email, role } = req.body
    if (!email) return res.status(400).json({ error: 'Email est requis.' })

    const familyId = await getFamilyId(auth.userId)
    if (!familyId) return res.status(404).json({ error: 'Aucune famille trouvée.' })

    // Check if already invited
    const [existing] = await db
      .select()
      .from(schema.invitations)
      .where(and(
        eq(schema.invitations.familyId, familyId),
        eq(schema.invitations.inviteeEmail, email),
        eq(schema.invitations.status, 'pending')
      ))
      .limit(1)

    if (existing) {
      return res.status(409).json({ error: 'Une invitation est déjà en attente pour cet email.' })
    }

    try {
      const token = crypto.randomBytes(32).toString('hex')

      const [invitation] = await db
        .insert(schema.invitations)
        .values({
          familyId,
          invitedBy: auth.userId,
          inviteeEmail: email,
          role: role || 'member',
          token,
        })
        .returning()

      // Create notification for the invitee if they have an account
      const [inviteeUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1)

      if (inviteeUser) {
        await createNotification(
          inviteeUser.id,
          'invitation',
          'Invitation reçue',
          `Vous avez été invité(e) à rejoindre un espace familial sur Transmission.`,
          '/invitations'
        )
      }

      return res.status(201).json(invitation)
    } catch (err) {
      console.error('Create invitation error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  if (req.method === 'PATCH') {
    const { invitationId, action } = req.body
    if (!invitationId) return res.status(400).json({ error: 'invitationId requis.' })

    try {
      const newStatus = action === 'decline' ? 'declined' : 'cancelled'

      const [updated] = await db
        .update(schema.invitations)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(schema.invitations.id, invitationId))
        .returning()

      if (!updated) return res.status(404).json({ error: 'Invitation non trouvée.' })
      return res.status(200).json(updated)
    } catch (err) {
      console.error('Update invitation error:', err)
      return res.status(500).json({ error: 'Erreur serveur.' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

async function createNotification(userId: string, type: string, title: string, message: string, linkTo?: string) {
  try {
    await db.insert(schema.notifications).values({
      userId,
      type,
      title,
      message,
      linkTo,
    })
  } catch (err) {
    console.error('Create notification error:', err)
  }
}
