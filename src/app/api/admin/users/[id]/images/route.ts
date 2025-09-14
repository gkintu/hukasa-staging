import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, projects, sourceImages, generations, adminActions } from '@/db/schema'
import { eq, sql, desc, ilike, or, type SQL } from 'drizzle-orm'
import { validateApiSession } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const session = await validateApiSession(request)
    if (!session) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    const { id: userId } = await params

    // Verify target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!targetUser) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''
    const projectId = searchParams.get('projectId') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const offset = (page - 1) * pageSize

    // Build where conditions for source images
    const conditions = [eq(sourceImages.userId, userId)]
    
    if (searchQuery) {
      conditions.push(
        or(
          ilike(sourceImages.originalFileName, `%${searchQuery}%`),
          ilike(sourceImages.displayName, `%${searchQuery}%`)
        ) as SQL
      );
    }

    if (projectId) {
      conditions.push(eq(sourceImages.projectId, projectId))
    }

    // Build additional conditions for generations if status filter is specified
    const allConditions = [...conditions]
    if (status) {
      allConditions.push(
        or(
          eq(generations.status, status as 'pending' | 'processing' | 'completed' | 'failed'),
          sql`${generations.status} IS NULL`
        ) as SQL
      )
    }

    // Get user's source images with project information and generation data
    const userImages = await db
      .select({
        // Source image fields
        id: sourceImages.id,
        projectId: sourceImages.projectId,
        projectName: projects.name,
        originalImagePath: sourceImages.originalImagePath,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        fileSize: sourceImages.fileSize,
        isFavorited: sourceImages.isFavorited,
        createdAt: sourceImages.createdAt,
        // Generation fields (can be null if no generations exist)
        generationId: generations.id,
        stagedImagePath: generations.stagedImagePath,
        variationIndex: generations.variationIndex,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        operationType: generations.operationType,
        generationStatus: generations.status,
        jobId: generations.jobId,
        processingTimeMs: generations.processingTimeMs,
        errorMessage: generations.errorMessage,
        completedAt: generations.completedAt
      })
      .from(sourceImages)
      .innerJoin(projects, eq(sourceImages.projectId, projects.id))
      .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
      .where(sql`${sql.join(allConditions, sql` AND `)}`)
      .orderBy(desc(sourceImages.createdAt), generations.variationIndex)
      .limit(pageSize * 10) // Get more to account for multiple generations per source
      .offset(offset)

    // Get total count for pagination (count distinct source images)
    const totalCountResult = await db
      .select({ count: sql<number>`count(distinct ${sourceImages.id})` })
      .from(sourceImages)
      .innerJoin(projects, eq(sourceImages.projectId, projects.id))
      .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
      .where(sql`${sql.join(allConditions, sql` AND `)}`)

    // Group by source image
    const sourceImagesMap = new Map<string, {
      id: string
      projectId: string
      projectName: string
      originalImagePath: string
      originalFileName: string
      displayName: string | null
      fileSize: number | null
      roomType: string | null
      stagingStyle: string | null
      operationType: string | null
      createdAt: Date
      variants: Array<{
        id: string
        stagedImagePath: string | null
        variationIndex: number
        roomType: string
        stagingStyle: string
        operationType: string
        status: string
        jobId: string | null
        errorMessage: string | null
        processingTimeMs: number | null
        completedAt: Date | null
      }>
    }>()

    for (const image of userImages) {
      const key = image.id // Use source image ID as key
      
      if (!sourceImagesMap.has(key)) {
        // Use the first generation's metadata as the source image's metadata 
        // (for backwards compatibility with admin UI)
        sourceImagesMap.set(key, {
          id: image.id,
          projectId: image.projectId,
          projectName: image.projectName,
          originalImagePath: image.originalImagePath,
          originalFileName: image.originalFileName,
          displayName: image.displayName,
          fileSize: image.fileSize,
          roomType: image.roomType, // From first generation or null
          stagingStyle: image.stagingStyle, // From first generation or null
          operationType: image.operationType, // From first generation or null
          createdAt: image.createdAt,
          variants: []
        })
      }

      // Add generation if it exists
      if (image.generationId) {
        sourceImagesMap.get(key)!.variants.push({
          id: image.generationId,
          stagedImagePath: image.stagedImagePath,
          variationIndex: image.variationIndex || 0,
          roomType: image.roomType || '',
          stagingStyle: image.stagingStyle || '',
          operationType: image.operationType || '',
          status: image.generationStatus || 'pending',
          jobId: image.jobId,
          errorMessage: image.errorMessage,
          processingTimeMs: image.processingTimeMs,
          completedAt: image.completedAt
        })
      }
    }

    const sourceImagesArray = Array.from(sourceImagesMap.values())
    const totalCount = totalCountResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    // Get user's projects for filtering options
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        imageCount: sql<number>`count(${sourceImages.id})`
      })
      .from(projects)
      .leftJoin(sourceImages, eq(projects.id, sourceImages.projectId))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id, projects.name)
      .orderBy(desc(projects.updatedAt))

    // Log admin action
    await db.insert(adminActions).values({
      action: 'VIEW_USER_IMAGES',
      adminId: session.user.id,
      targetUserId: userId,
      targetResourceType: 'user_images',
      targetResourceId: userId,
      targetResourceName: targetUser.name || targetUser.email,
      metadata: JSON.stringify({ 
        search: searchQuery,
        projectId,
        status,
        page,
        totalImages: totalCount
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      createdAt: new Date()
    })

    return Response.json({
      success: true,
      data: {
        sourceImages: sourceImagesArray,
        projects: userProjects,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Admin user images error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch user images' 
    }, { status: 500 })
  }
}