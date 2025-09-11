/**
 * Admin User Project Query Functions
 * 
 * Handles user-centric project queries for admin panel with aggregated 
 * project statistics per user.
 */

import { db } from '@/db';
import { projects, users, sourceImages, generations } from '@/db/schema';
import { 
  eq, 
  and, 
  or, 
  ilike, 
  count, 
  sql, 
  gte, 
  lte, 
  desc, 
  asc 
} from 'drizzle-orm';
import type { 
  UserProjectListQuery, 
  UserProjectListResponse, 
  UserWithProjects,
  ProjectDetail
} from './user-project-schemas';

/**
 * Get users with aggregated project statistics
 */
export async function getUsersWithProjectStats(query: UserProjectListQuery): Promise<UserProjectListResponse> {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    suspended,
    hasProjects,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const offset = (page - 1) * limit;

  // Build base conditions
  const conditions = [];

  // Search filter - search in user name and email
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    );
  }

  // Role filter
  if (role) {
    conditions.push(eq(users.role, role));
  }

  // Suspended filter
  if (suspended !== undefined) {
    conditions.push(eq(users.suspended, suspended));
  }

  // Date range filters
  if (startDate) {
    conditions.push(gte(users.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(users.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build sorting
  const orderByClause = (() => {
    const direction = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'name':
        return direction(users.name);
      case 'email':
        return direction(users.email);
      case 'updatedAt':
        return direction(users.updatedAt);
      case 'lastActiveAt':
        return direction(users.lastActiveAt);
      case 'projectCount':
        return direction(sql`project_count`);
      case 'createdAt':
      default:
        return direction(users.createdAt);
    }
  })();

  // Build base query using $dynamic() to avoid TypeScript chaining issues
  let usersQuery = db
    .select({
      // User data
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      suspended: users.suspended,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastActiveAt: users.lastActiveAt,
      lastLoginAt: users.lastLoginAt,
      // Aggregated statistics
      projectCount: sql<number>`COALESCE(COUNT(DISTINCT ${projects.id}), 0)`,
      totalImages: sql<number>`COALESCE(COUNT(DISTINCT ${sourceImages.id}), 0)`,
      completedImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
      pendingImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      processingImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'processing' THEN 1 ELSE 0 END), 0)`,
      failedImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
    })
    .from(users)
    .leftJoin(projects, eq(projects.userId, users.id))
    .leftJoin(sourceImages, eq(sourceImages.projectId, projects.id))
    .leftJoin(generations, eq(generations.sourceImageId, sourceImages.id))
    .where(whereClause)
    .groupBy(users.id)
    .$dynamic();

  // Apply hasProjects filter with having clause
  if (hasProjects !== undefined) {
    if (hasProjects) {
      usersQuery = usersQuery.having(sql`COUNT(DISTINCT ${projects.id}) > 0`);
    } else {
      usersQuery = usersQuery.having(sql`COUNT(DISTINCT ${projects.id}) = 0`);
    }
  }

  // Apply ordering and pagination
  usersQuery = usersQuery.orderBy(orderByClause).limit(limit).offset(offset);

  // Execute main query
  const usersResult = await usersQuery;

  // Get total count for pagination using $dynamic()
  let totalCountQuery = db
    .select({ count: count() })
    .from(users)
    .leftJoin(projects, eq(projects.userId, users.id))
    .where(whereClause)
    .groupBy(users.id)
    .$dynamic();

  // Apply hasProjects filter to count query as well
  if (hasProjects !== undefined) {
    if (hasProjects) {
      totalCountQuery = totalCountQuery.having(sql`COUNT(DISTINCT ${projects.id}) > 0`);
    } else {
      totalCountQuery = totalCountQuery.having(sql`COUNT(DISTINCT ${projects.id}) = 0`);
    }
  }

  const totalCountResult = await totalCountQuery;
  const total = totalCountResult.length;

  // Transform results
  const userRows: UserWithProjects[] = usersResult.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: row.role,
    suspended: row.suspended ?? false, // Handle null values from database
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastActiveAt: row.lastActiveAt,
    lastLoginAt: row.lastLoginAt,
    projectCount: Number(row.projectCount),
    totalImages: Number(row.totalImages),
    completedImages: Number(row.completedImages),
    pendingImages: Number(row.pendingImages),
    processingImages: Number(row.processingImages),
    failedImages: Number(row.failedImages),
  }));

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    users: userRows,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage,
      hasPrevPage,
    },
  };
}

/**
 * Get detailed projects for a specific user
 */
export async function getUserProjects(userId: string): Promise<ProjectDetail[]> {
  const projectsResult = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      imageCount: sql<number>`COALESCE(COUNT(DISTINCT ${sourceImages.id}), 0)`,
      completedImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
      pendingImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      processingImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'processing' THEN 1 ELSE 0 END), 0)`,
      failedImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
    })
    .from(projects)
    .leftJoin(sourceImages, eq(sourceImages.projectId, projects.id))
    .leftJoin(generations, eq(generations.sourceImageId, sourceImages.id))
    .where(eq(projects.userId, userId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return projectsResult.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    imageCount: Number(row.imageCount),
    completedImages: Number(row.completedImages),
    pendingImages: Number(row.pendingImages),
    processingImages: Number(row.processingImages),
    failedImages: Number(row.failedImages),
  }));
}

/**
 * Log admin project actions for audit trail
 * Reusing the same function from project-queries.ts
 */
export async function logAdminProjectAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata: Record<string, unknown> = {},
  request?: Request
): Promise<void> {
  try {
    const userAgent = request?.headers.get('user-agent') || null;
    const ipAddress = request?.headers.get('x-forwarded-for') || 
                     request?.headers.get('x-real-ip') || null;

    // For now, just log to console - can be enhanced to use audit_logs table
    console.log('Admin Project Action:', {
      adminId,
      action,
      entityType,
      entityId,
      description,
      metadata,
      userAgent,
      ipAddress,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log admin project action:', error);
  }
}