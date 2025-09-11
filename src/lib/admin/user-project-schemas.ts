import { z } from 'zod';

/**
 * Query schema for user project list with validation
 */
export const UserProjectListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  suspended: z.coerce.boolean().optional(),
  hasProjects: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'email', 'projectCount', 'lastActiveAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type UserProjectListQuery = z.infer<typeof UserProjectListQuerySchema>;

/**
 * User with project statistics
 */
export interface UserWithProjects {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'user' | 'admin';
  suspended: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActiveAt: Date | string | null;
  lastLoginAt: Date | string | null;
  projectCount: number;
  totalImages: number;
  completedImages: number;
  pendingImages: number;
  processingImages: number;
  failedImages: number;
}

/**
 * Individual project details for modal
 */
export interface ProjectDetail {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  imageCount: number;
  completedImages: number;
  pendingImages: number;
  processingImages: number;
  failedImages: number;
}

/**
 * Pagination metadata
 */
export interface UserProjectPagination {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * API Response for user project list
 */
export interface UserProjectListResponse {
  users: UserWithProjects[];
  pagination: UserProjectPagination;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse {
  success: boolean;
  message: string;
  data?: UserProjectListResponse;
  error?: string;
}