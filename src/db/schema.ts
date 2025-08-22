import { pgTable, text, timestamp, boolean, integer, pgEnum, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums for room types, staging styles, operation types, and status
export const roomTypeEnum = pgEnum('room_type', [
  'living_room',
  'bedroom', 
  'kitchen',
  'bathroom',
  'office',
  'dining_room'
])

export const stagingStyleEnum = pgEnum('staging_style', [
  'modern',
  'luxury',
  'traditional',
  'scandinavian',
  'industrial',
  'bohemian'
])

export const operationTypeEnum = pgEnum('operation_type', [
  'stage_empty',
  'remove_furniture'
])

export const statusEnum = pgEnum('status', [
  'pending',
  'processing',
  'completed',
  'failed'
])

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  name: text('name').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull()
})

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(), // User-defined project name
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Generations table
export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  originalImagePath: text('original_image_path').notNull(), // Relative path: "uploads/uuid-filename.jpg"
  originalFileName: text('original_file_name').notNull(), // Original user filename: "vacation-photo.jpg"
  fileSize: integer('file_size'), // File size in bytes (nullable for migration)
  stagedImagePath: text('staged_image_path'), // Relative path: "uploads/staged-uuid-filename.jpg"
  variationIndex: integer('variation_index').default(1).notNull(), // 1, 2, 3 for multiple AI generations
  roomType: roomTypeEnum('room_type').notNull(),
  stagingStyle: stagingStyleEnum('staging_style').notNull(),
  operationType: operationTypeEnum('operation_type').notNull(),
  status: statusEnum('status').default('pending').notNull(),
  isFavorited: boolean('is_favorited').default(false).notNull(),
  jobId: text('job_id'),
  errorMessage: text('error_message'),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at')
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  generations: many(generations)
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id]
  }),
  generations: many(generations)
}))

export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id]
  })
}))

// Better Auth tables
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').references(() => users.id).notNull()
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull()
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull()
})

// Type exports for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert