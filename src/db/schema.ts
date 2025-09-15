import { pgTable, text, timestamp, boolean, integer, pgEnum, uuid, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums for room types, staging styles, operation types, and status
export const roomTypeEnum = pgEnum('room_type', [
  'living_room',
  'bedroom', 
  'kitchen',
  'bathroom',
  'office',
  'dining_room',
  'kids_room',
  'home_office'
])

export const stagingStyleEnum = pgEnum('staging_style', [
  'modern',
  'midcentury',
  'scandinavian', 
  'luxury',
  'coastal',
  'industrial',
  'minimalist',
  'standard'
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

export const auditActionEnum = pgEnum('audit_action', [
  'DELETE_IMAGE',
  'VIEW_USER_PROFILE', 
  'SUSPEND_USER',
  'UNSUSPEND_USER',
  'MODERATE_IMAGE',
  'UPDATE_SETTINGS',
  'CREATE_USER',
  'DELETE_USER',
  'VIEW_AUDIT_LOGS',
  'BULK_DELETE_IMAGES',
  'BULK_REPROCESS_IMAGES',
  'BULK_MOVE_IMAGES',
  'VIEW_IMAGE_STATS',
  'ACCESS_ADMIN_DASHBOARD',
  'SEARCH_USERS',
  'VIEW_ALL_IMAGES',
  'VIEW_IMAGES_LIST',
  'VIEW_USER_IMAGES'
])

export const userRoleEnum = pgEnum('user_role', [
  'user',
  'admin'
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
  role: userRoleEnum('role')
    .$defaultFn(() => 'user')
    .notNull(),
  suspended: boolean('suspended')
    .$defaultFn(() => false),
  lastActiveAt: timestamp('last_active_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull()
}, (table) => {
  return {
    emailIdx: index('idx_users_email').on(table.email)
  }
})

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(), // User-defined project name
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('idx_projects_user_id').on(table.userId)
  }
})

// Source Images table - stores original uploaded images
export const sourceImages = pgTable('source_images', {
  id: text('id').primaryKey(), // Nanoid instead of UUID for clean URLs
  userId: text('user_id').references(() => users.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  originalImagePath: text('original_image_path').notNull(), // Relative path: "uploads/uuid-filename.jpg"
  originalFileName: text('original_file_name').notNull(), // Original user filename: "vacation-photo.jpg"
  displayName: text('display_name'), // User-customizable display name, falls back to originalFileName if null
  fileSize: integer('file_size'), // File size in bytes
  isFavorited: boolean('is_favorited').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    userIdIdx: index('idx_source_images_user_id').on(table.userId),
    projectIdIdx: index('idx_source_images_project_id').on(table.projectId)
  }
})

// Generations table - stores AI-generated staging results based on source images
export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceImageId: text('source_image_id').references(() => sourceImages.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  stagedImagePath: text('staged_image_path'), // Relative path: "uploads/staged-uuid-filename.jpg"
  variationIndex: integer('variation_index').default(1).notNull(), // 1, 2, 3 for multiple AI generations
  roomType: roomTypeEnum('room_type').notNull(),
  stagingStyle: stagingStyleEnum('staging_style').notNull(),
  operationType: operationTypeEnum('operation_type').notNull(),
  status: statusEnum('status').default('pending').notNull(),
  jobId: text('job_id'),
  errorMessage: text('error_message'),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at')
}, (table) => {
  return {
    sourceImageIdIdx: index('idx_generations_source_image_id').on(table.sourceImageId),
    userIdIdx: index('idx_generations_user_id').on(table.userId)
  }
})

// Admin actions audit table
export const adminActions = pgTable('admin_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: auditActionEnum('action').notNull(),
  adminId: text('admin_id').references(() => users.id).notNull(),
  targetUserId: text('target_user_id').references(() => users.id),
  targetResourceType: text('target_resource_type'), // 'image', 'user_profile', 'project', etc.
  targetResourceId: text('target_resource_id'),
  targetResourceName: text('target_resource_name'),
  reason: text('reason'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON string for additional context
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    adminIdIdx: index('idx_admin_actions_admin_id').on(table.adminId)
  }
})

// System settings table
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  settingType: text('setting_type').notNull(), // 'security', 'moderation', 'system', 'notification'
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  sourceImages: many(sourceImages),
  generations: many(generations)
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id]
  }),
  sourceImages: many(sourceImages),
  generations: many(generations)
}))

export const sourceImagesRelations = relations(sourceImages, ({ one, many }) => ({
  user: one(users, {
    fields: [sourceImages.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [sourceImages.projectId],
    references: [projects.id]
  }),
  generations: many(generations)
}))

export const generationsRelations = relations(generations, ({ one }) => ({
  sourceImage: one(sourceImages, {
    fields: [generations.sourceImageId],
    references: [sourceImages.id]
  }),
  user: one(users, {
    fields: [generations.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id]
  })
}))

export const adminActionsRelations = relations(adminActions, ({ one }) => ({
  admin: one(users, {
    fields: [adminActions.adminId],
    references: [users.id]
  }),
  targetUser: one(users, {
    fields: [adminActions.targetUserId],
    references: [users.id]
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
}, (table) => {
  return {
    userIdIdx: index('idx_sessions_user_id').on(table.userId)
  }
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
export type SourceImage = typeof sourceImages.$inferSelect
export type NewSourceImage = typeof sourceImages.$inferInsert
export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert
export type AdminAction = typeof adminActions.$inferSelect
export type NewAdminAction = typeof adminActions.$inferInsert
export type SystemSetting = typeof systemSettings.$inferSelect
export type NewSystemSetting = typeof systemSettings.$inferInsert