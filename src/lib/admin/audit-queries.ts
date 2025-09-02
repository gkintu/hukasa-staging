import { db } from '@/db';
import { adminActions, users } from '@/db/schema';
import { and, or, eq, ilike, gte, lte, desc, asc, count, sql } from 'drizzle-orm';
import type { AuditListQuery } from './audit-schemas';

// Helper function to build dynamic where conditions
export function buildAuditWhereConditions(query: AuditListQuery) {
  const conditions = [];

  // Text search across multiple fields
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    conditions.push(
      or(
        ilike(adminActions.action, searchTerm),
        ilike(adminActions.targetResourceName, searchTerm),
        ilike(adminActions.targetResourceType, searchTerm),
        ilike(adminActions.ipAddress, searchTerm),
        // Search in admin user fields
        sql`EXISTS (
          SELECT 1 FROM users admin_users 
          WHERE admin_users.id = ${adminActions.adminId}
          AND (
            ${ilike(sql`admin_users.email`, searchTerm)} OR
            ${ilike(sql`admin_users.name`, searchTerm)}
          )
        )`,
        // Search in target user fields  
        sql`EXISTS (
          SELECT 1 FROM users target_users 
          WHERE target_users.id = ${adminActions.targetUserId}
          AND (
            ${ilike(sql`target_users.email`, searchTerm)} OR
            ${ilike(sql`target_users.name`, searchTerm)}
          )
        )`
      )
    );
  }

  // Action filter
  if (query.action) {
    conditions.push(eq(adminActions.action, query.action));
  }

  // Admin filter
  if (query.adminId) {
    conditions.push(eq(adminActions.adminId, query.adminId));
  }

  // Target user filter
  if (query.targetUserId) {
    conditions.push(eq(adminActions.targetUserId, query.targetUserId));
  }

  // Date range filters
  if (query.startDate) {
    conditions.push(gte(adminActions.createdAt, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(adminActions.createdAt, query.endDate));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Helper function to build order by clause
export function buildAuditOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
  const direction = sortOrder === 'desc' ? desc : asc;
  
  switch (sortBy) {
    case 'action':
      return direction(adminActions.action);
    case 'adminEmail':
      return direction(sql`admin_users.email`);
    case 'targetResourceName':
      return direction(adminActions.targetResourceName);
    case 'createdAt':
    default:
      return direction(adminActions.createdAt);
  }
}

// Main query builder for audit logs with all joins
export async function getAuditLogsWithFilters(query: AuditListQuery) {
  const whereClause = buildAuditWhereConditions(query);
  const orderBy = buildAuditOrderBy(query.sortBy, query.sortOrder);
  const offset = (query.page - 1) * query.limit;

  // Get total count for pagination
  const totalCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminActions)
    .where(whereClause);

  const totalCount = totalCountResult[0]?.count || 0;

  // Get audit logs with all related data
  const logs = await db
    .select({
      // AdminAction fields
      id: adminActions.id,
      action: adminActions.action,
      adminId: adminActions.adminId,
      targetUserId: adminActions.targetUserId,
      targetResourceType: adminActions.targetResourceType,
      targetResourceId: adminActions.targetResourceId,
      targetResourceName: adminActions.targetResourceName,
      metadata: adminActions.metadata,
      ipAddress: adminActions.ipAddress,
      userAgent: adminActions.userAgent,
      createdAt: adminActions.createdAt,
      
      // Admin user fields
      adminName: sql<string | null>`admin_users.name`,
      adminEmail: sql<string>`admin_users.email`,
      adminImage: sql<string | null>`admin_users.image`,
      
      // Target user fields (nullable)
      targetUserName: sql<string | null>`target_users.name`,
      targetUserEmail: sql<string | null>`target_users.email`,
      targetUserImage: sql<string | null>`target_users.image`,
    })
    .from(adminActions)
    .innerJoin(
      sql`users admin_users`,
      eq(adminActions.adminId, sql`admin_users.id`)
    )
    .leftJoin(
      sql`users target_users`,
      eq(adminActions.targetUserId, sql`target_users.id`)
    )
    .where(whereClause)
    .orderBy(orderBy)
    .limit(query.limit)
    .offset(offset);

  // Transform results to match schema
  const processedLogs = logs.map(log => ({
    id: log.id,
    action: log.action,
    adminId: log.adminId,
    targetUserId: log.targetUserId,
    targetResourceType: log.targetResourceType,
    targetResourceId: log.targetResourceId,
    targetResourceName: log.targetResourceName,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    admin: {
      id: log.adminId,
      name: log.adminName,
      email: log.adminEmail,
      image: log.adminImage,
    },
    targetUser: log.targetUserId ? {
      id: log.targetUserId,
      name: log.targetUserName,
      email: log.targetUserEmail!,
      image: log.targetUserImage,
    } : null,
  }));

  return {
    logs: processedLogs,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / query.limit),
      hasNextPage: query.page < Math.ceil(totalCount / query.limit),
      hasPrevPage: query.page > 1,
    }
  };
}

// Statistics queries
export async function getAuditStatistics(dateRange?: { start: Date; end: Date }) {
  const whereCondition = dateRange 
    ? and(gte(adminActions.createdAt, dateRange.start), lte(adminActions.createdAt, dateRange.end))
    : undefined;

  const [
    totalResult,
    actionStats,
    topAdminsResult,
    recentActivityData
  ] = await Promise.all([
    // Total actions
    db.select({ count: sql<number>`count(*)` })
      .from(adminActions)
      .where(whereCondition),

    // Action distribution
    db.select({
      action: adminActions.action,
      count: count()
    })
      .from(adminActions)
      .where(whereCondition)
      .groupBy(adminActions.action),

    // Top admins by action count
    db.select({
      adminId: adminActions.adminId,
      adminName: sql<string | null>`users.name`,
      adminEmail: sql<string>`users.email`,
      actionCount: sql<number>`count(*)`
    })
      .from(adminActions)
      .innerJoin(users, eq(adminActions.adminId, users.id))
      .where(whereCondition)
      .groupBy(adminActions.adminId, sql`users.name`, sql`users.email`)
      .orderBy(desc(sql`count(*)`))
      .limit(5),

    // Recent activity (last 30 days by day)
    db.select({
      date: sql<string>`DATE_TRUNC('day', ${adminActions.createdAt})`,
      actions: sql<number>`COUNT(*)`
    })
      .from(adminActions)
      .where(
        dateRange?.start 
          ? and(whereCondition, gte(adminActions.createdAt, dateRange.start))
          : gte(adminActions.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
      .groupBy(sql`DATE_TRUNC('day', ${adminActions.createdAt})`)
      .orderBy(desc(sql`DATE_TRUNC('day', ${adminActions.createdAt})`))
      .limit(30)
  ]);

  // Count unique admins
  const uniqueAdminsResult = await db
    .select({ count: sql<number>`count(distinct ${adminActions.adminId})` })
    .from(adminActions)
    .where(whereCondition);

  const recentActivity = recentActivityData.map(activity => ({
    date: new Date(activity.date),
    actions: activity.actions,
  }));

  return {
    totalActions: totalResult[0]?.count || 0,
    uniqueAdmins: uniqueAdminsResult[0]?.count || 0,
    actionsByType: Object.fromEntries(actionStats.map(s => [s.action, s.count])),
    recentActivity,
    topAdmins: topAdminsResult.map(admin => ({
      adminId: admin.adminId,
      adminName: admin.adminName,
      adminEmail: admin.adminEmail,
      actionCount: admin.actionCount,
    })),
  };
}

// Log audit action helper (reuse existing from image-queries but make it more generic)
export async function logAdminAuditAction(
  adminId: string,
  action: string,
  targetResourceType: string,
  targetResourceId: string,
  targetResourceName: string,
  metadata?: Record<string, unknown>,
  targetUserId?: string,
  request?: Request
) {
  await db.insert(adminActions).values({
    action: action as typeof adminActions.action.enumValues[number],
    adminId,
    targetUserId: targetUserId || null,
    targetResourceType,
    targetResourceId,
    targetResourceName,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: request?.headers.get('x-forwarded-for') || 
                request?.headers.get('x-real-ip') || 
                'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
    createdAt: new Date(),
  });
}