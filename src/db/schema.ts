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
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Generations table
export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  originalImagePath: text('original_image_path').notNull(), // Relative path: "uploads/uuid-filename.jpg"
  stagedImagePath: text('staged_image_path'), // Relative path: "uploads/staged-uuid-filename.jpg"
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
  generations: many(generations)
}))

export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id]
  })
}))

// Better Auth tables
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').references(() => users.id).notNull()
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Type exports for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert
export type Session = typeof session.$inferSelect
export type NewSession = typeof session.$inferInsert
export type Account = typeof account.$inferSelect
export type NewAccount = typeof account.$inferInsert
export type Verification = typeof verification.$inferSelect
export type NewVerification = typeof verification.$inferInsert