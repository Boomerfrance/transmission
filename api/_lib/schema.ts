/**
 * Database schema for Transmission — Drizzle ORM + Neon PostgreSQL
 *
 * Tables:
 * - users: User accounts
 * - families: Family groups
 * - family_members: Members of a family
 * - assets: Patrimony items
 * - canvas_answers: Family Canvas questionnaire responses
 * - llm_config: LLM configuration (admin-managed, 3 params)
 * - conversations: AI chat history
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Assets (Patrimony) ────────────────────────────────

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id')
    .references(() => families.id)
    .notNull(),
  category: varchar('category', { length: 50 }).notNull(), // immobilier | financier | professionnel | autre
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

// ── Conversations ─────────────────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  familyId: uuid('family_id').references(() => families.id),
  messages: jsonb('messages').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
