import { z } from 'zod';

/**
 * Unified delete schemas for both admin and main app
 * Supports different delete contexts and options
 */

// Basic delete operation for simple contexts (main app)
export const SimpleDeleteSchema = z.object({
  confirm: z.boolean().default(true),
  reason: z.string().optional(),
});

// Advanced delete operation for admin contexts
export const AdvancedDeleteSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  deleteVariants: z.boolean().default(true),
  deleteSourceFile: z.boolean().default(false),
});

// Unified delete options that can handle both contexts
export const UnifiedDeleteSchema = z.union([
  SimpleDeleteSchema,
  AdvancedDeleteSchema,
]);

// Delete response schema
export const DeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    imageId: z.string().uuid(),
    deletedVariants: z.number().int().optional(),
    deletedFiles: z.array(z.string()).optional(),
  }),
});

// Context enum to determine which delete pattern to use
export const DeleteContextSchema = z.enum(['main', 'admin']);

// Combined delete request
export const DeleteRequestSchema = z.object({
  id: z.string().uuid(),
  context: DeleteContextSchema.default('main'),
  options: UnifiedDeleteSchema.optional(),
});

// Type exports
export type SimpleDelete = z.infer<typeof SimpleDeleteSchema>;
export type AdvancedDelete = z.infer<typeof AdvancedDeleteSchema>;
export type UnifiedDelete = z.infer<typeof UnifiedDeleteSchema>;
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;
export type DeleteContext = z.infer<typeof DeleteContextSchema>;
export type DeleteRequest = z.infer<typeof DeleteRequestSchema>;