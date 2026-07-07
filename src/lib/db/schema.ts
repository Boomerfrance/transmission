/**
 * Database schema for Transmission — Drizzle ORM + Neon PostgreSQL
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  real,
} from 'drizzle-orm/pg-core'

// ── Users ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'admin' | 'user'
  blocked: boolean('blocked').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Families ───────────────────────────────────────────

export const families = pgTable('families', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: uuid('owner_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const familyMembers = pgTable('family_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  relationship: varchar('relationship', { length: 100 }).notNull(),
  birthYear: integer('birth_year'),
  notes: text('notes'),
  parentId: uuid('parent_id'), // self-reference for tree structure
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Assets (Patrimony) ────────────────────────────────

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  label: varchar('label', { length: 500 }).notNull(),
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Canvas (Family Questionnaire) ─────────────────────

export const canvasAnswers = pgTable('canvas_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  sectionId: varchar('section_id', { length: 100 }).notNull(),
  questionId: varchar('question_id', { length: 100 }).notNull(),
  answer: text('answer').notNull(),
  answeredBy: uuid('answered_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── LLM Configuration (Admin-managed) ─────────────────

export const llmConfig = pgTable('llm_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  model: varchar('model', { length: 100 }).notNull().default('gpt-4o'),
  temperature: real('temperature').notNull().default(0.3),
  systemPrompt: text('system_prompt').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Documents ─────────────────────────────────────────

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('a_fournir'),
  notes: text('notes'),
  fileName: varchar('file_name', { length: 255 }),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Checklist ─────────────────────────────────────────

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Blog Articles ─────────────────────────────────────

export const blogArticles = pgTable('blog_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 500 }).notNull(),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  published: boolean('published').notNull().default(false),
  authorName: varchar('author_name', { length: 255 }).notNull().default('Transmission'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Conversations & Messages ──────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  familyId: uuid('family_id').references(() => families.id),
  title: varchar('title', { length: 255 }).notNull().default('Nouvelle conversation'),
  messages: jsonb('messages').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Invitations ───────────────────────────────────────

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  invitedBy: uuid('invited_by')
    .references(() => users.id)
    .notNull(),
  inviteeEmail: varchar('invitee_email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'), // member | editor
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending | accepted | declined
  acceptedBy: uuid('accepted_by').references(() => users.id),
  token: varchar('token', { length: 255 }).notNull(), // unique invite token
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Family Access (who can access which family) ───────

export const familyAccess = pgTable('family_access', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'), // owner | member | editor
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Notifications ─────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  type: varchar('type', { length: 50 }).notNull(), // invitation | checklist | document | system
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  linkTo: varchar('link_to', { length: 255 }), // optional in-app link
  metadata: jsonb('metadata'), // extra data
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
