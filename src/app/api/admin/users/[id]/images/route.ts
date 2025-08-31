import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, projects, generations, adminActions } from '@/db/schema'
import { eq, sql, desc, ilike, or } from 'drizzle-orm'
import { validateApiSession } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const userId = params.id

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

    // Build where conditions
    let conditions = [eq(generations.userId, userId)]
    
    if (searchQuery) {
      conditions.push(
        or(
          ilike(generations.originalFileName, `%${searchQuery}%`),
          ilike(generations.displayName, `%${searchQuery}%`)
        )
      )
    }

    if (projectId) {
      conditions.push(eq(generations.projectId, projectId))
    }

    if (status) {
      conditions.push(eq(generations.status, status as any))
    }

    // Get user's images with project information
    const userImages = await db
      .select({
        id: generations.id,
        projectId: generations.projectId,
        projectName: projects.name,
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
        completedAt: generations.completedAt
      })
      .from(generations)
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(sql`${sql.join(conditions, sql` AND `)}`)
      .orderBy(desc(generations.createdAt), generations.originalImagePath, generations.variationIndex)
      .limit(pageSize)
      .offset(offset)

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(generations)
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(sql`${sql.join(conditions, sql` AND `)}`)

    // Group images by originalImagePath (source image)
    const sourceImages = new Map<string, {
      id: string
      projectId: string
      projectName: string
      originalImagePath: string
      originalFileName: string
      displayName: string | null
      fileSize: number | null
      roomType: string
      stagingStyle: string
      operationType: string
      createdAt: Date
      variants: Array<{
        id: string
        stagedImagePath: string | null
        variationIndex: number
        status: string
        isFavorited: boolean
        processingTimeMs: number | null
        errorMessage: string | null
        completedAt: Date | null
      }>
    }>()

    for (const image of userImages) {
      const key = image.originalImagePath
      
      if (!sourceImages.has(key)) {
        sourceImages.set(key, {
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
          variants: []
        })
      }

      sourceImages.get(key)!.variants.push({
        id: image.id,
        stagedImagePath: image.stagedImagePath,
        variationIndex: image.variationIndex,
        status: image.status,
        isFavorited: image.isFavorited,
        processingTimeMs: image.processingTimeMs,
        errorMessage: image.errorMessage,
        completedAt: image.completedAt
      })
    }

    const sourceImagesArray = Array.from(sourceImages.values())
    const totalCount = totalCountResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    // Get user's projects for filtering options
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        imageCount: sql<number>`count(${generations.id})`
      })
      .from(projects)
      .leftJoin(generations, eq(projects.id, generations.projectId))
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