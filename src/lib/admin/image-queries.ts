import { db } from '@/db';
import { generations, projects, users, adminActions } from '@/db/schema';
import { and, or, eq, ilike, gte, lte, desc, asc, count, sql, inArray } from 'drizzle-orm';
import type { ImageListQuery, AdvancedSearch } from './image-schemas';

// Helper function to build dynamic where conditions
export function buildImageWhereConditions(query: ImageListQuery) {
  const conditions = [];

  // Text search across multiple fields
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    conditions.push(
      or(
        ilike(generations.originalFileName, searchTerm),
        ilike(generations.displayName, searchTerm),
        ilike(projects.name, searchTerm),
        ilike(users.name, searchTerm),
        ilike(users.email, searchTerm)
      )
    );
  }

  // Status filter
  if (query.status) {
    conditions.push(eq(generations.status, query.status));
  }

  // Room type filter
  if (query.roomType) {
    conditions.push(eq(generations.roomType, query.roomType));
  }

  // Staging style filter
  if (query.stagingStyle) {
    conditions.push(eq(generations.stagingStyle, query.stagingStyle));
  }

  // User filter
  if (query.userId) {
    conditions.push(eq(generations.userId, query.userId));
  }

  // Project filter
  if (query.projectId) {
    conditions.push(eq(generations.projectId, query.projectId));
  }

  // Date range filters
  if (query.startDate) {
    conditions.push(gte(generations.createdAt, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(generations.createdAt, query.endDate));
  }

  // File size filters
  if (query.fileSize?.min) {
    conditions.push(gte(generations.fileSize, query.fileSize.min));
  }
  if (query.fileSize?.max) {
    conditions.push(lte(generations.fileSize, query.fileSize.max));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Helper function to build order by clause
export function buildImageOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
  const direction = sortOrder === 'desc' ? desc : asc;
  
  switch (sortBy) {
    case 'originalFileName':
      return direction(generations.originalFileName);
    case 'userName':
      return direction(users.name);
    case 'projectName':
      return direction(projects.name);
    case 'status':
      return direction(generations.status);
    case 'updatedAt':
      return direction(generations.completedAt);
    case 'createdAt':
    default:
      return direction(generations.createdAt);
  }
}

// Main query builder for image list with all joins
export async function getImagesWithFilters(query: ImageListQuery) {
  const whereClause = buildImageWhereConditions(query);
  const orderBy = buildImageOrderBy(query.sortBy, query.sortOrder);
  const offset = (query.page - 1) * query.limit;

  // Get total count for pagination
  const totalCountResult = await db
    .select({ count: sql<number>`count(distinct ${generations.originalImagePath})` })
    .from(generations)
    .innerJoin(users, eq(generations.userId, users.id))
    .innerJoin(projects, eq(generations.projectId, projects.id))
    .where(whereClause);

  const totalCount = totalCountResult[0]?.count || 0;

  // Get images with all related data, grouped by source image
  const rawImages = await db
    .select({
      // Generation fields
      id: generations.id,
      projectId: generations.projectId,
      originalImagePath: generations.originalImagePath,
      originalFileName: generations.originalFileName,
      displayName: generations.displayName,
      fileSize: generations.fileSize,
      stagedImagePath: generations.stagedImagePath,
      variationIndex: generations.variationIndex,
      roomType: generations.roomType,
      stagingStyle: generations.stagingStyle,
      operationType: generations.operationType,
      status: generations.status,
      isFavorited: generations.isFavorited,
      processingTimeMs: generations.processingTimeMs,
      errorMessage: generations.errorMessage,
      createdAt: generations.createdAt,
      completedAt: generations.completedAt,
      
      // User fields
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      
      // Project fields
      projectName: projects.name,
    })
    .from(generations)
    .innerJoin(users, eq(generations.userId, users.id))
    .innerJoin(projects, eq(generations.projectId, projects.id))
    .where(whereClause)
    .orderBy(orderBy, generations.originalImagePath, generations.variationIndex)
    .limit(query.limit * 10) // Get more to account for grouping
    .offset(offset);

  // Group images by originalImagePath (source image)
  const groupedImages = new Map();
  
  for (const image of rawImages) {
    const key = image.originalImagePath;
    
    if (!groupedImages.has(key)) {
      groupedImages.set(key, {
        id: image.id,
        projectId: image.projectId,
        projectName: image.projectName,
        originalImagePath: image.originalImagePath,
        originalFileName: image.originalFileName,
        displayName: image.displayName,
        fileSize: image.fileSize,
        roomType: image.roomType,
        stagingStyle: image.stagingStyle,
        operationType: image.operationType,
        createdAt: image.createdAt,
        completedAt: image.completedAt,
        user: {
          id: image.userId,
          name: image.userName,
          email: image.userEmail,
          image: image.userImage,
        },
        variants: [],
      });
    }

    // Add variant to the group
    groupedImages.get(key).variants.push({
      id: image.id,
      stagedImagePath: image.stagedImagePath,
      variationIndex: image.variationIndex,
      status: image.status,
      isFavorited: image.isFavorited,
      processingTimeMs: image.processingTimeMs,
      errorMessage: image.errorMessage,
      completedAt: image.completedAt,
    });
  }

  // Convert to array and add computed fields
  const processedImages = Array.from(groupedImages.values())
    .slice(0, query.limit) // Apply actual limit after grouping
    .map(image => {
      const completedVariants = image.variants.filter((v: { status: string }) => v.status === 'completed').length;
      const failedVariants = image.variants.filter((v: { status: string }) => v.status === 'failed').length;
      const totalVariants = image.variants.length;
      
      // Determine overall status
      let overallStatus = 'completed';
      if (image.variants.some((v: { status: string }) => v.status === 'processing')) {
        overallStatus = 'processing';
      } else if (image.variants.some((v: { status: string }) => v.status === 'pending')) {
        overallStatus = 'pending';
      } else if (failedVariants > 0 && completedVariants === 0) {
        overallStatus = 'failed';
      }

      return {
        ...image,
        totalVariants,
        completedVariants,
        failedVariants,
        overallStatus,
      };
    });

  return {
    images: processedImages,
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

// Advanced search with weighted relevance
export async function performAdvancedImageSearch(search: AdvancedSearch) {
  const { query: searchQuery, searchFields, filters, pagination, sort } = search;
  
  // Build search conditions with field-specific weighting
  const searchConditions = [];
  
  if (searchFields.includes('originalFileName')) {
    searchConditions.push(ilike(generations.originalFileName, `%${searchQuery}%`));
  }
  if (searchFields.includes('displayName')) {
    searchConditions.push(ilike(generations.displayName, `%${searchQuery}%`));
  }
  if (searchFields.includes('projectName')) {
    searchConditions.push(ilike(projects.name, `%${searchQuery}%`));
  }
  if (searchFields.includes('userName')) {
    searchConditions.push(ilike(users.name, `%${searchQuery}%`));
  }
  if (searchFields.includes('userEmail')) {
    searchConditions.push(ilike(users.email, `%${searchQuery}%`));
  }

  // Note: searchConditions and filters would be used in a more complete search implementation

  return getImagesWithFilters({
    ...filters,
    ...pagination,
    ...sort,
    search: undefined, // We handle search separately
  });
}

// Get single image with all variants
export async function getImageById(imageId: string) {
  const result = await db
    .select({
      // Generation fields
      id: generations.id,
      projectId: generations.projectId,
      originalImagePath: generations.originalImagePath,
      originalFileName: generations.originalFileName,
      displayName: generations.displayName,
      fileSize: generations.fileSize,
      stagedImagePath: generations.stagedImagePath,
      variationIndex: generations.variationIndex,
      roomType: generations.roomType,
      stagingStyle: generations.stagingStyle,
      operationType: generations.operationType,
      status: generations.status,
      isFavorited: generations.isFavorited,
      processingTimeMs: generations.processingTimeMs,
      errorMessage: generations.errorMessage,
      createdAt: generations.createdAt,
      completedAt: generations.completedAt,
      
      // User fields
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      
      // Project fields
      projectName: projects.name,
    })
    .from(generations)
    .innerJoin(users, eq(generations.userId, users.id))
    .innerJoin(projects, eq(generations.projectId, projects.id))
    .where(eq(generations.id, imageId));

  if (result.length === 0) {
    return null;
  }

  const image = result[0];
  
  // Get all variants for the same source image
  const allVariants = await db
    .select({
      id: generations.id,
      stagedImagePath: generations.stagedImagePath,
      variationIndex: generations.variationIndex,
      status: generations.status,
      isFavorited: generations.isFavorited,
      processingTimeMs: generations.processingTimeMs,
      errorMessage: generations.errorMessage,
      completedAt: generations.completedAt,
    })
    .from(generations)
    .where(eq(generations.originalImagePath, image.originalImagePath))
    .orderBy(generations.variationIndex);

  return {
    id: image.id,
    projectId: image.projectId,
    projectName: image.projectName,
    originalImagePath: image.originalImagePath,
    originalFileName: image.originalFileName,
    displayName: image.displayName,
    fileSize: image.fileSize,
    roomType: image.roomType,
    stagingStyle: image.stagingStyle,
    operationType: image.operationType,
    createdAt: image.createdAt,
    completedAt: image.completedAt,
    variants: allVariants,
    user: {
      id: image.userId,
      name: image.userName,
      email: image.userEmail,
      image: image.userImage,
    },
  };
}

// Bulk operations query utilities
export async function getBulkImagesByIds(imageIds: string[]) {
  return db
    .select({
      id: generations.id,
      originalImagePath: generations.originalImagePath,
      originalFileName: generations.originalFileName,
      projectId: generations.projectId,
      userId: generations.userId,
      status: generations.status,
    })
    .from(generations)
    .where(inArray(generations.id, imageIds));
}

// Statistics queries
export async function getImageStatistics(dateRange?: { start: Date; end: Date }) {
  const whereCondition = dateRange 
    ? and(gte(generations.createdAt, dateRange.start), lte(generations.createdAt, dateRange.end))
    : undefined;

  const [
    totalResult,
    statusStats,
    roomTypeStats,
    stagingStyleStats,
    avgProcessingTime,
    avgFileSize,
    totalStorage
  ] = await Promise.all([
    // Total images (distinct source images)
    db.select({ count: sql<number>`count(distinct ${generations.originalImagePath})` })
      .from(generations)
      .where(whereCondition),

    // Status distribution
    db.select({
      status: generations.status,
      count: count()
    })
      .from(generations)
      .where(whereCondition)
      .groupBy(generations.status),

    // Room type distribution  
    db.select({
      roomType: generations.roomType,
      count: count()
    })
      .from(generations)
      .where(whereCondition)
      .groupBy(generations.roomType),

    // Staging style distribution
    db.select({
      stagingStyle: generations.stagingStyle,
      count: count()
    })
      .from(generations)
      .where(whereCondition)
      .groupBy(generations.stagingStyle),

    // Average processing time
    db.select({ avg: sql<number>`avg(${generations.processingTimeMs})` })
      .from(generations)
      .where(and(whereCondition, eq(generations.status, 'completed'))),

    // Average file size
    db.select({ avg: sql<number>`avg(${generations.fileSize})` })
      .from(generations)
      .where(whereCondition),

    // Total storage used
    db.select({ sum: sql<number>`sum(${generations.fileSize})` })
      .from(generations)
      .where(whereCondition),
  ]);

  // Create properly typed objects with all required enum keys
  const statusCounts = Object.fromEntries(statusStats.map(s => [s.status, s.count]));
  const roomTypeCounts = Object.fromEntries(roomTypeStats.map(r => [r.roomType, r.count]));
  const stagingStyleCounts = Object.fromEntries(stagingStyleStats.map(s => [s.stagingStyle, s.count]));

  return {
    totalImages: totalResult[0]?.count || 0,
    byStatus: {
      pending: statusCounts.pending || 0,
      processing: statusCounts.processing || 0,
      completed: statusCounts.completed || 0,
      failed: statusCounts.failed || 0,
    },
    byRoomType: {
      living_room: roomTypeCounts.living_room || 0,
      bedroom: roomTypeCounts.bedroom || 0,
      kitchen: roomTypeCounts.kitchen || 0,
      bathroom: roomTypeCounts.bathroom || 0,
      office: roomTypeCounts.office || 0,
      dining_room: roomTypeCounts.dining_room || 0,
    },
    byStagingStyle: {
      modern: stagingStyleCounts.modern || 0,
      luxury: stagingStyleCounts.luxury || 0,
      traditional: stagingStyleCounts.traditional || 0,
      scandinavian: stagingStyleCounts.scandinavian || 0,
      industrial: stagingStyleCounts.industrial || 0,
      bohemian: stagingStyleCounts.bohemian || 0,
    },
    avgProcessingTime: avgProcessingTime[0]?.avg || null,
    avgFileSize: avgFileSize[0]?.avg || null,
    totalStorageUsed: totalStorage[0]?.sum || 0,
  };
}

// Log admin action helper
export async function logAdminImageAction(
  adminId: string,
  action: string,
  targetResourceType: string,
  targetResourceId: string,
  targetResourceName: string,
  metadata?: Record<string, unknown>,
  request?: Request
) {
  await db.insert(adminActions).values({
    action: action as typeof adminActions.action.enumValues[number],
    adminId,
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