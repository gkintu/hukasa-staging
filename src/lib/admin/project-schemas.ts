import { z } from 'zod';

// Base schemas for projects
export const SortOrderSchema = z.enum(['asc', 'desc']);

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'userName', 'imageCount']).default('createdAt'),
  sortOrder: SortOrderSchema.default('desc'),
});

// Project list query schema
export const ProjectListQuerySchema = PaginationSchema.merge(SortSchema).extend({
  search: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Project response schemas
export const ProjectRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
  imageCount: z.number().int(),
  completedImages: z.number().int(),
  pendingImages: z.number().int(),
  processingImages: z.number().int(),
  failedImages: z.number().int(),
});

export const PaginationInfoSchema = z.object({
  total: z.number().int(),
  totalPages: z.number().int(),
  currentPage: z.number().int(),
  pageSize: z.number().int(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectRowSchema),
  pagination: PaginationInfoSchema,
});

// Response wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
});

// Type exports
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
export type ProjectRow = z.infer<typeof ProjectRowSchema>;
export type PaginationInfo = z.infer<typeof PaginationInfoSchema>;
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;