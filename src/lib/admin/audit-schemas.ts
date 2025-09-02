import { z } from 'zod';

// Audit action enum schema
export const AuditActionSchema = z.enum([
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
]);

// Base schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.enum(['createdAt', 'action', 'adminEmail', 'targetResourceName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Audit list query schema
export const AuditListQuerySchema = PaginationSchema.merge(SortSchema).extend({
  search: z.string().optional(),
  action: AuditActionSchema.optional(),
  adminId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Audit entry response schema
export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  action: AuditActionSchema,
  adminId: z.string().uuid(),
  targetUserId: z.string().uuid().nullable(),
  targetResourceType: z.string().nullable(),
  targetResourceId: z.string().nullable(),
  targetResourceName: z.string().nullable(),
  metadata: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  
  // Related data
  admin: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
  targetUser: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }).nullable(),
});

// Audit list response schema
export const AuditListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    logs: z.array(AuditEntrySchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean(),
    }),
  }),
});

// Audit statistics response schema
export const AuditStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalActions: z.number().int(),
    uniqueAdmins: z.number().int(),
    actionsByType: z.record(z.string(), z.number().int()),
    recentActivity: z.array(z.object({
      date: z.date(),
      actions: z.number().int(),
    })),
    topAdmins: z.array(z.object({
      adminId: z.string().uuid(),
      adminName: z.string().nullable(),
      adminEmail: z.string(),
      actionCount: z.number().int(),
    })),
  }),
});

// Generic API response schemas
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.any().optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
});

export const ApiResponseSchema = z.union([ApiSuccessResponseSchema, ApiErrorResponseSchema]);

// Type exports for use throughout the application
export type AuditListQuery = z.infer<typeof AuditListQuerySchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export type AuditListResponse = z.infer<typeof AuditListResponseSchema>;
export type AuditStatsResponse = z.infer<typeof AuditStatsResponseSchema>;
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};