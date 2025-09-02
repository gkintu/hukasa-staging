import { z } from 'zod';

// Enums for validation
export const ImageStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export const RoomTypeSchema = z.enum(['living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'dining_room']);
export const StagingStyleSchema = z.enum(['modern', 'luxury', 'traditional', 'scandinavian', 'industrial', 'bohemian']);
export const SortOrderSchema = z.enum(['asc', 'desc']);

// Base schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sortBy: z.enum(['createdAt', 'updatedAt', 'originalFileName', 'userName', 'projectName', 'status']).default('createdAt'),
  sortOrder: SortOrderSchema.default('desc'),
});

// Image list query schema
export const ImageListQuerySchema = PaginationSchema.merge(SortSchema).extend({
  search: z.string().optional(),
  status: ImageStatusSchema.optional(),
  roomType: RoomTypeSchema.optional(),
  stagingStyle: StagingStyleSchema.optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  fileSize: z.object({
    min: z.coerce.number().positive().optional(),
    max: z.coerce.number().positive().optional(),
  }).optional(),
});

// Image details response schema
export const ImageVariantSchema = z.object({
  id: z.string().uuid(),
  stagedImagePath: z.string().nullable(),
  variationIndex: z.number().int(),
  status: ImageStatusSchema,
  isFavorited: z.boolean(),
  processingTimeMs: z.number().nullable(),
  errorMessage: z.string().nullable(),
  completedAt: z.date().nullable(),
});

export const ImageDetailSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  originalImagePath: z.string(),
  originalFileName: z.string(),
  displayName: z.string().nullable(),
  fileSize: z.number().nullable(),
  roomType: RoomTypeSchema,
  stagingStyle: StagingStyleSchema,
  operationType: z.string(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
  variants: z.array(ImageVariantSchema),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
});

// Image list response schema (grouped by source image)
export const ImageListItemSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  originalImagePath: z.string(),
  originalFileName: z.string(),
  displayName: z.string().nullable(),
  fileSize: z.number().nullable(),
  roomType: RoomTypeSchema,
  stagingStyle: StagingStyleSchema,
  operationType: z.string(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
  variants: z.array(ImageVariantSchema),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
  // Computed fields
  totalVariants: z.number().int(),
  completedVariants: z.number().int(),
  failedVariants: z.number().int(),
  overallStatus: ImageStatusSchema,
});

export const ImageListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    images: z.array(ImageListItemSchema),
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

// Bulk operations schemas
export const BulkActionSchema = z.enum(['delete', 'reprocess', 'move_project', 'update_status']);

export const BulkOperationSchema = z.object({
  action: BulkActionSchema,
  imageIds: z.array(z.string().uuid()).min(1),
  // Optional parameters based on action
  targetProjectId: z.string().uuid().optional(),
  reason: z.string().min(1).max(500).optional(),
});

export const BulkOperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    processed: z.number().int(),
    failed: z.number().int(),
    details: z.array(z.object({
      imageId: z.string().uuid(),
      success: z.boolean(),
      error: z.string().optional(),
    })),
  }),
});

// Image delete schema
export const ImageDeleteSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  deleteVariants: z.boolean().default(true),
  deleteSourceFile: z.boolean().default(false),
});

export const ImageDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    imageId: z.string().uuid(),
    deletedVariants: z.number().int(),
    deletedFiles: z.array(z.string()),
  }),
});


// Statistics schemas
export const ImageStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalImages: z.number().int(),
    byStatus: z.record(ImageStatusSchema, z.number().int()),
    byRoomType: z.record(RoomTypeSchema, z.number().int()),
    byStagingStyle: z.record(StagingStyleSchema, z.number().int()),
    avgProcessingTime: z.number().nullable(),
    avgFileSize: z.number().nullable(),
    totalStorageUsed: z.number(),
    recentActivity: z.array(z.object({
      date: z.date(),
      uploads: z.number().int(),
      completed: z.number().int(),
      failed: z.number().int(),
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
export type ImageListQuery = z.infer<typeof ImageListQuerySchema>;
export type ImageDetail = z.infer<typeof ImageDetailSchema>;
export type ImageListItem = z.infer<typeof ImageListItemSchema>;
export type ImageListResponse = z.infer<typeof ImageListResponseSchema>;
export type BulkOperation = z.infer<typeof BulkOperationSchema>;
export type BulkOperationResponse = z.infer<typeof BulkOperationResponseSchema>;
export type ImageDelete = z.infer<typeof ImageDeleteSchema>;
export type ImageDeleteResponse = z.infer<typeof ImageDeleteResponseSchema>;
export type ImageStatsResponse = z.infer<typeof ImageStatsResponseSchema>;
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};