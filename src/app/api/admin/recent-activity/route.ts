import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, sourceImages, projects, adminActions } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { validateApiSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const sessionResult = await validateApiSession(request)
    if (!sessionResult.success || !sessionResult.user) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionResult.user!.id)
    })

    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    // Get recent user signups (last 10)
    const recentSignups = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        type: sql<string>`'user_signup'`
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5)

    // Get recent source image uploads (last 10)
    const recentUploads = await db
      .select({
        id: sourceImages.id,
        fileName: sourceImages.originalFileName,
        userName: users.name,
        userEmail: users.email,
        projectName: projects.name,
        status: sql<string>`'uploaded'`, // Source images are always 'uploaded'
        createdAt: sourceImages.createdAt,
        type: sql<string>`'image_upload'`
      })
      .from(sourceImages)
      .leftJoin(users, eq(sourceImages.userId, users.id))
      .leftJoin(projects, eq(sourceImages.projectId, projects.id))
      .orderBy(desc(sourceImages.createdAt))
      .limit(5)

    // Get recent admin actions (last 10)
    const recentAdminActions = await db
      .select({
        id: adminActions.id,
        action: adminActions.action,
        adminName: sql<string>`admin_user.name`,
        targetUserName: sql<string>`target_user.name`,
        targetResourceName: adminActions.targetResourceName,
        reason: adminActions.reason,
        createdAt: adminActions.createdAt,
        type: sql<string>`'admin_action'`
      })
      .from(adminActions)
      .leftJoin(sql`users AS admin_user`, eq(adminActions.adminId, sql`admin_user.id`))
      .leftJoin(sql`users AS target_user`, eq(adminActions.targetUserId, sql`target_user.id`))
      .orderBy(desc(adminActions.createdAt))
      .limit(5)

    // Combine and format activities
    const activities = [
      // User signups
      ...recentSignups.map(signup => ({
        id: `signup_${signup.id}`,
        type: 'user_signup' as const,
        title: 'New user registered',
        description: `${signup.name} (${signup.email})`,
        user: {
          name: signup.name,
          email: signup.email,
          role: signup.role
        },
        timestamp: signup.createdAt
      })),

      // Image uploads  
      ...recentUploads.map(upload => ({
        id: `upload_${upload.id}`,
        type: 'image_upload' as const,
        title: 'Image uploaded',
        description: `${upload.fileName} by ${upload.userName}`,
        user: {
          name: upload.userName,
          email: upload.userEmail
        },
        metadata: {
          projectName: upload.projectName,
          status: upload.status,
          fileName: upload.fileName
        },
        timestamp: upload.createdAt
      })),

      // Admin actions
      ...recentAdminActions.map(action => ({
        id: `action_${action.id}`,
        type: 'admin_action' as const,
        title: 'Admin action',
        description: `${action.action.replace('_', ' ').toLowerCase()} by ${action.adminName}`,
        admin: {
          name: action.adminName
        },
        metadata: {
          action: action.action,
          targetUserName: action.targetUserName,
          targetResourceName: action.targetResourceName,
          reason: action.reason
        },
        timestamp: action.createdAt
      }))
    ]

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Take only the most recent 15 activities
    const recentActivities = activities.slice(0, 15)

    return Response.json({
      success: true,
      data: recentActivities
    })

  } catch (error) {
    console.error('Recent activity error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch recent activity' 
    }, { status: 500 })
  }
}