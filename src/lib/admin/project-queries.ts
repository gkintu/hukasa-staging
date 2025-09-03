/**
 * Admin Project Query Functions
 * 
 * Handles complex project queries for admin panel with pagination, filtering,
 * and sorting capabilities. Includes project statistics and user information.
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
  ProjectListQuery, 
  ProjectListResponse, 
  ProjectRow 
} from './project-schemas';

/**
 * Get projects with advanced filtering, pagination, and statistics
 */
export async function getProjectsWithFilters(query: ProjectListQuery): Promise<ProjectListResponse> {
  const {
    page = 1,
    limit = 20,
    search,
    userId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const offset = (page - 1) * limit;

  // Build base conditions
  const conditions = [];

  // Search filter - search in project name, description, and user details
  if (search) {
    conditions.push(
      or(
        ilike(projects.name, `%${search}%`),
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    );
  }

  // User filter
  if (userId) {
    conditions.push(eq(projects.userId, userId));
  }

  // Date range filters
  if (startDate) {
    conditions.push(gte(projects.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(projects.createdAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build sorting
  const orderByClause = (() => {
    const direction = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'name':
        return direction(projects.name);
      case 'updatedAt':
        return direction(projects.updatedAt);
      case 'userName':
        return direction(users.name);
      case 'imageCount':
        return direction(sql`image_count`);
      case 'createdAt':
      default:
        return direction(projects.createdAt);
    }
  })();

  // Main query with statistics
  const projectsQuery = db
    .select({
      // Project data
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      // User data
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      // Statistics
      imageCount: sql<number>`COALESCE(COUNT(DISTINCT ${sourceImages.id}), 0)`,
      completedImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
      pendingImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      processingImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'processing' THEN 1 ELSE 0 END), 0)`,
      failedImages: sql<number>`COALESCE(SUM(CASE WHEN ${generations.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .leftJoin(sourceImages, eq(sourceImages.projectId, projects.id))
    .leftJoin(generations, eq(generations.sourceImageId, sourceImages.id))
    .where(whereClause)
    .groupBy(projects.id, users.id)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  // Execute main query
  const projectsResult = await projectsQuery;

  // Get total count for pagination
  const totalCountQuery = db
    .select({ count: count() })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(whereClause);
  
  const [{ count: total }] = await totalCountQuery;

  // Transform results
  const projectRows: ProjectRow[] = projectsResult.map((row) => ({
    id: row.id,
    name: row.name,
    description: null, // Projects table doesn't have description yet
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      image: row.userImage,
    },
    imageCount: Number(row.imageCount),
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
    projects: projectRows,
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
 * Log admin project actions for audit trail
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