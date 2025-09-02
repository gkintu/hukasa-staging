import { z } from 'zod';

// Basic image schemas for main app (simpler than admin)
export const BasicImageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  originalImagePath: z.string(),
  originalFileName: z.string(),
  displayName: z.string().nullable(),
  fileSize: z.number().nullable(),
  roomType: z.string(),
  stagingStyle: z.string(),
  operationType: z.string(),
  createdAt: z.date(),
  variants: z.array(z.object({
    id: z.string().uuid(),
    stagedImagePath: z.string().nullable(),
    variationIndex: z.number().int(),
    status: z.string(),
    completedAt: z.date().nullable(),
    errorMessage: z.string().nullable(),
  })),
});

// Main app image list query (simple filters)
export const MainImageListQuerySchema = z.object({
  unassignedOnly: z.boolean().optional(),
  projectId: z.string().uuid().optional(),
});

// Main app image list response
export const MainImageListResponseSchema = z.object({
  success: z.boolean(),
  sourceImages: z.array(BasicImageSchema),
  message: z.string().optional(),
});

// Project schemas for main app
export const BasicProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sourceImageCount: z.number().int().optional(),
});

export const ProjectListResponseSchema = z.object({
  success: z.boolean(),
  projects: z.array(BasicProjectSchema),
  message: z.string().optional(),
});

export const ProjectDetailResponseSchema = z.object({
  success: z.boolean(),
  project: BasicProjectSchema,
  sourceImages: z.array(BasicImageSchema),
  message: z.string().optional(),
});

// Type exports
export type BasicImage = z.infer<typeof BasicImageSchema>;
export type MainImageListQuery = z.infer<typeof MainImageListQuerySchema>;
export type MainImageListResponse = z.infer<typeof MainImageListResponseSchema>;
export type BasicProject = z.infer<typeof BasicProjectSchema>;
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;
export type ProjectDetailResponse = z.infer<typeof ProjectDetailResponseSchema>;