import { db } from '@/db';
import { sourceImages, generations, projects, users, adminActions } from '@/db/schema';
import { and, or, eq, ilike, gte, lte, desc, asc, count, sql, inArray } from 'drizzle-orm';
import type { ImageListQuery } from './image-schemas';

// Helper function to build dynamic where conditions
export function buildImageWhereConditions(query: ImageListQuery) {
  const conditions = [];

  // Text search across multiple fields
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    conditions.push(
      or(
        ilike(sourceImages.originalFileName, searchTerm),
        ilike(sourceImages.displayName, searchTerm),
        ilike(projects.name, searchTerm),
        ilike(users.name, searchTerm),
        ilike(users.email, searchTerm)
      )
    );
  }

  // Status filter - check if any generation has this status
  if (query.status) {
    conditions.push(eq(generations.status, query.status));
  }

  // Room type filter - check if any generation has this room type
  if (query.roomType) {
    conditions.push(eq(generations.roomType, query.roomType));
  }

  // Staging style filter - check if any generation has this staging style
  if (query.stagingStyle) {
    conditions.push(eq(generations.stagingStyle, query.stagingStyle));
  }

  // User filter
  if (query.userId) {
    conditions.push(eq(sourceImages.userId, query.userId));
  }

  // Project filter
  if (query.projectId) {
    conditions.push(eq(sourceImages.projectId, query.projectId));
  }

  // Date range filters
  if (query.startDate) {
    conditions.push(gte(sourceImages.createdAt, query.startDate));
  }
  if (query.endDate) {
    conditions.push(lte(sourceImages.createdAt, query.endDate));
  }

  // File size filters
  if (query.fileSize?.min) {
    conditions.push(gte(sourceImages.fileSize, query.fileSize.min));
  }
  if (query.fileSize?.max) {
    conditions.push(lte(sourceImages.fileSize, query.fileSize.max));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Helper function to build order by clause
export function buildImageOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
  const direction = sortOrder === 'desc' ? desc : asc;
  
  switch (sortBy) {
    case 'originalFileName':
      return direction(sourceImages.originalFileName);
    case 'userName':
      return direction(users.name);
    case 'projectName':
      return direction(projects.name);
    case 'status':
      // For status, we'll need to handle this in post-processing since it's computed
      return direction(sourceImages.createdAt);
    case 'updatedAt':
      return direction(sourceImages.updatedAt);
    case 'createdAt':
    default:
      return direction(sourceImages.createdAt);
  }
}

// Main query builder for image list with all joins
export async function getImagesWithFilters(query: ImageListQuery) {
  const whereClause = buildImageWhereConditions(query);
  const orderBy = buildImageOrderBy(query.sortBy, query.sortOrder);
  const offset = (query.page - 1) * query.limit;

  // Get total count for pagination - count source images
  const totalCountResult = await db
    .select({ count: sql<number>`count(distinct ${sourceImages.id})` })
    .from(sourceImages)
    .innerJoin(users, eq(sourceImages.userId, users.id))
    .innerJoin(projects, eq(sourceImages.projectId, projects.id))
    .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
    .where(whereClause);

  const totalCount = totalCountResult[0]?.count || 0;

  // Get source images with all related data
  const sourceImagesData = await db
    .select({
      // Source Image fields
      id: sourceImages.id,
      projectId: sourceImages.projectId,
      originalImagePath: sourceImages.originalImagePath,
      originalFileName: sourceImages.originalFileName,
      displayName: sourceImages.displayName,
      fileSize: sourceImages.fileSize,
      isFavorited: sourceImages.isFavorited,
      createdAt: sourceImages.createdAt,
      updatedAt: sourceImages.updatedAt,
      
      // User fields
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      
      // Project fields
      projectName: projects.name,
    })
    .from(sourceImages)
    .innerJoin(users, eq(sourceImages.userId, users.id))
    .innerJoin(projects, eq(sourceImages.projectId, projects.id))
    .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(query.limit)
    .offset(offset)
    .groupBy(
      sourceImages.id,
      sourceImages.projectId,
      sourceImages.originalImagePath,
      sourceImages.originalFileName,
      sourceImages.displayName,
      sourceImages.fileSize,
      sourceImages.isFavorited,
      sourceImages.createdAt,
      sourceImages.updatedAt,
      users.id,
      users.name,
      users.email,
      users.image,
      projects.name
    );

  // Get all generations for these source images
  const sourceImageIds = sourceImagesData.map(img => img.id);
  const allGenerations = sourceImageIds.length > 0 ? await db
    .select({
      id: generations.id,
      sourceImageId: generations.sourceImageId,
      stagedImagePath: generations.stagedImagePath,
      variationIndex: generations.variationIndex,
      roomType: generations.roomType,
      stagingStyle: generations.stagingStyle,
      operationType: generations.operationType,
      status: generations.status,
      processingTimeMs: generations.processingTimeMs,
      errorMessage: generations.errorMessage,
      completedAt: generations.completedAt,
    })
    .from(generations)
    .where(inArray(generations.sourceImageId, sourceImageIds))
    .orderBy(generations.sourceImageId, generations.variationIndex) : [];

  // Group generations by source image ID
  const generationsBySourceId = new Map();
  for (const gen of allGenerations) {
    if (!generationsBySourceId.has(gen.sourceImageId)) {
      generationsBySourceId.set(gen.sourceImageId, []);
    }
    generationsBySourceId.get(gen.sourceImageId).push(gen);
  }

  // Combine source images with their generations
  const processedImages = sourceImagesData.map(image => {
    const variants = generationsBySourceId.get(image.id) || [];
    const completedVariants = variants.filter((v: { status: string }) => v.status === 'completed').length;
    const failedVariants = variants.filter((v: { status: string }) => v.status === 'failed').length;
    const totalVariants = variants.length;
    
    // Determine overall status
    let overallStatus = totalVariants === 0 ? 'no_generations' : 'completed';
    if (variants.some((v: { status: string }) => v.status === 'processing')) {
      overallStatus = 'processing';
    } else if (variants.some((v: { status: string }) => v.status === 'pending')) {
      overallStatus = 'pending';
    } else if (failedVariants > 0 && completedVariants === 0) {
      overallStatus = 'failed';
    }

    // Get the most common room type and staging style from variants
    const roomType = variants.length > 0 ? variants[0].roomType : null;
    const stagingStyle = variants.length > 0 ? variants[0].stagingStyle : null;
    const operationType = variants.length > 0 ? variants[0].operationType : null;
    const completedAt = variants.find((v: { completedAt?: Date | null }) => v.completedAt)?.completedAt || null;

    return {
      id: image.id,
      projectId: image.projectId,
      projectName: image.projectName,
      originalImagePath: image.originalImagePath,
      originalFileName: image.originalFileName,
      displayName: image.displayName,
      fileSize: image.fileSize,
      roomType,
      stagingStyle,
      operationType,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      completedAt,
      user: {
        id: image.userId,
        name: image.userName,
        email: image.userEmail,
        image: image.userImage,
      },
      variants,
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


// Get single source image with all variants (by source image ID)
export async function getImageById(sourceImageId: string) {
  // Get the source image
  const sourceImageResult = await db
    .select({
      // Source Image fields
      id: sourceImages.id,
      projectId: sourceImages.projectId,
      originalImagePath: sourceImages.originalImagePath,
      originalFileName: sourceImages.originalFileName,
      displayName: sourceImages.displayName,
      fileSize: sourceImages.fileSize,
      isFavorited: sourceImages.isFavorited,
      createdAt: sourceImages.createdAt,
      updatedAt: sourceImages.updatedAt,
      
      // User fields
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      
      // Project fields
      projectName: projects.name,
    })
    .from(sourceImages)
    .innerJoin(users, eq(sourceImages.userId, users.id))
    .innerJoin(projects, eq(sourceImages.projectId, projects.id))
    .where(eq(sourceImages.id, sourceImageId));

  if (sourceImageResult.length === 0) {
    return null;
  }

  const image = sourceImageResult[0];
  
  // Get all variants (generations) for this source image
  const allVariants = await db
    .select({
      id: generations.id,
      stagedImagePath: generations.stagedImagePath,
      variationIndex: generations.variationIndex,
      roomType: generations.roomType,
      stagingStyle: generations.stagingStyle,
      operationType: generations.operationType,
      status: generations.status,
      processingTimeMs: generations.processingTimeMs,
      errorMessage: generations.errorMessage,
      completedAt: generations.completedAt,
    })
    .from(generations)
    .where(eq(generations.sourceImageId, sourceImageId))
    .orderBy(generations.variationIndex);

  // Get the most recent completion date from variants
  const completedAt = allVariants.find(v => v.completedAt)?.completedAt || null;
  const roomType = allVariants.length > 0 ? allVariants[0].roomType : null;
  const stagingStyle = allVariants.length > 0 ? allVariants[0].stagingStyle : null;
  const operationType = allVariants.length > 0 ? allVariants[0].operationType : null;

  return {
    id: image.id,
    projectId: image.projectId,
    projectName: image.projectName,
    originalImagePath: image.originalImagePath,
    originalFileName: image.originalFileName,
    displayName: image.displayName,
    fileSize: image.fileSize,
    roomType,
    stagingStyle,
    operationType,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
    completedAt,
    variants: allVariants,
    user: {
      id: image.userId,
      name: image.userName,
      email: image.userEmail,
      image: image.userImage,
    },
  };
}

// Bulk operations query utilities - for source images
export async function getBulkImagesByIds(sourceImageIds: string[]) {
  return db
    .select({
      id: sourceImages.id,
      originalImagePath: sourceImages.originalImagePath,
      originalFileName: sourceImages.originalFileName,
      projectId: sourceImages.projectId,
      userId: sourceImages.userId,
    })
    .from(sourceImages)
    .where(inArray(sourceImages.id, sourceImageIds));
}

// Statistics queries
export async function getImageStatistics(dateRange?: { start: Date; end: Date }) {
  const sourceImageWhereCondition = dateRange 
    ? and(gte(sourceImages.createdAt, dateRange.start), lte(sourceImages.createdAt, dateRange.end))
    : undefined;
  
  const generationWhereCondition = dateRange 
    ? and(gte(generations.createdAt, dateRange.start), lte(generations.createdAt, dateRange.end))
    : undefined;

  const [
    totalSourceImagesResult,
    totalGenerationsResult,
    statusStats,
    roomTypeStats,
    stagingStyleStats,
    avgProcessingTime,
    avgFileSize,
    totalStorage
  ] = await Promise.all([
    // Total source images
    db.select({ count: count() })
      .from(sourceImages)
      .where(sourceImageWhereCondition),

    // Total generations
    db.select({ count: count() })
      .from(generations)
      .where(generationWhereCondition),

    // Status distribution (from generations)
    db.select({
      status: generations.status,
      count: count()
    })
      .from(generations)
      .where(generationWhereCondition)
      .groupBy(generations.status),

    // Room type distribution (from generations)
    db.select({
      roomType: generations.roomType,
      count: count()
    })
      .from(generations)
      .where(generationWhereCondition)
      .groupBy(generations.roomType),

    // Staging style distribution (from generations)
    db.select({
      stagingStyle: generations.stagingStyle,
      count: count()
    })
      .from(generations)
      .where(generationWhereCondition)
      .groupBy(generations.stagingStyle),

    // Average processing time (from completed generations)
    db.select({ avg: sql<number>`avg(${generations.processingTimeMs})` })
      .from(generations)
      .where(and(generationWhereCondition, eq(generations.status, 'completed'))),

    // Average file size (from source images)
    db.select({ avg: sql<number>`avg(${sourceImages.fileSize})` })
      .from(sourceImages)
      .where(sourceImageWhereCondition),

    // Total storage used (from source images)
    db.select({ sum: sql<number>`sum(${sourceImages.fileSize})` })
      .from(sourceImages)
      .where(sourceImageWhereCondition),
  ]);

  // Create properly typed objects with all required enum keys
  const statusCounts = Object.fromEntries(statusStats.map(s => [s.status, s.count]));
  const roomTypeCounts = Object.fromEntries(roomTypeStats.map(r => [r.roomType, r.count]));
  const stagingStyleCounts = Object.fromEntries(stagingStyleStats.map(s => [s.stagingStyle, s.count]));

  return {
    totalSourceImages: totalSourceImagesResult[0]?.count || 0,
    totalGenerations: totalGenerationsResult[0]?.count || 0,
    // Legacy field for backwards compatibility
    totalImages: totalSourceImagesResult[0]?.count || 0,
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
      scandinavian: stagingStyleCounts.scandinavian || 0,
      industrial: stagingStyleCounts.industrial || 0,
      midcentury: stagingStyleCounts.midcentury || 0,
      coastal: stagingStyleCounts.coastal || 0,
      minimalist: stagingStyleCounts.minimalist || 0,
      standard: stagingStyleCounts.standard || 0,
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