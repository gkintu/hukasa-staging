import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, projects, sourceImages, generations, adminActions } from '@/db/schema'
import { eq, sql, count, desc, gte, and } from 'drizzle-orm'
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

    // Get user details
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!targetUser) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    // Calculate dates for statistics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get comprehensive user statistics
    const [
      projectCountResult,
      imageCountResult,
      recentImagesResult,
      weeklyImagesResult,
      completedImagesResult,
      failedImagesResult
    ] = await Promise.all([
      // Total projects
      db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.userId, userId)),

      // Total source images uploaded
      db.select({ count: sql<number>`count(*)` })
        .from(sourceImages)
        .where(eq(sourceImages.userId, userId)),

      // Recent source images (last 30 days)
      db.select({ count: sql<number>`count(*)` })
        .from(sourceImages)
        .where(
          and(
            eq(sourceImages.userId, userId),
            gte(sourceImages.createdAt, thirtyDaysAgo)
          )
        ),

      // Weekly source images (last 7 days)
      db.select({ count: sql<number>`count(*)` })
        .from(sourceImages)
        .where(
          and(
            eq(sourceImages.userId, userId),
            gte(sourceImages.createdAt, sevenDaysAgo)
          )
        ),

      // Completed generations (count generations with completed status)
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
        .where(
          and(
            eq(sourceImages.userId, userId),
            eq(generations.status, 'completed')
          )
        ),

      // Failed generations (count generations with failed status)
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
        .where(
          and(
            eq(sourceImages.userId, userId),
            eq(generations.status, 'failed')
          )
        )
    ])

    // Get user's recent projects with source image counts
    const recentProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        imageCount: count(sourceImages.id)
      })
      .from(projects)
      .leftJoin(sourceImages, eq(projects.id, sourceImages.projectId))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id, projects.name, projects.createdAt, projects.updatedAt)
      .orderBy(desc(projects.updatedAt))
      .limit(5)

    // Get recent source images for activity timeline
    const recentActivity = await db
      .select({
        id: sourceImages.id,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        status: sql<string>`'uploaded'`, // Source images have status 'uploaded'
        createdAt: sourceImages.createdAt,
        completedAt: sourceImages.createdAt, // For source images, upload time = completion time
        projectName: projects.name
      })
      .from(sourceImages)
      .innerJoin(projects, eq(sourceImages.projectId, projects.id))
      .where(eq(sourceImages.userId, userId))
      .orderBy(desc(sourceImages.createdAt))
      .limit(10)

    // Log admin action
    await db.insert(adminActions).values({
      action: 'VIEW_USER_PROFILE',
      adminId: session.user.id,
      targetUserId: userId,
      targetResourceType: 'user_profile',
      targetResourceId: userId,
      targetResourceName: targetUser.name || targetUser.email,
      ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      createdAt: new Date()
    })

    const userProfile = {
      user: targetUser,
      statistics: {
        totalProjects: projectCountResult[0]?.count || 0,
        totalImages: imageCountResult[0]?.count || 0,
        recentImages: recentImagesResult[0]?.count || 0,
        weeklyImages: weeklyImagesResult[0]?.count || 0,
        completedImages: completedImagesResult[0]?.count || 0,
        failedImages: failedImagesResult[0]?.count || 0,
        successRate: imageCountResult[0]?.count > 0 
          ? Math.round(((completedImagesResult[0]?.count || 0) / imageCountResult[0].count) * 100)
          : 0
      },
      recentProjects,
      recentActivity
    }

    return Response.json({
      success: true,
      data: userProfile
    })

  } catch (error) {
    console.error('Admin user profile error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch user profile' 
    }, { status: 500 })
  }
}