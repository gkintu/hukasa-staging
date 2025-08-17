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

// Type exports for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert