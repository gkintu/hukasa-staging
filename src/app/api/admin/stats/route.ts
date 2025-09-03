import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, sourceImages, generations } from '@/db/schema'
import { eq, sql, gte } from 'drizzle-orm'
import { validateApiSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await validateApiSession(request)
    if (!session) {
      return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    })

    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    // Calculate date for weekly activity (7 days ago)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get all stats in parallel
    const [
      totalUsersResult,
      totalSourceImagesResult,
      totalGenerationsResult,
      activeAdminsResult,
      weeklySourceImagesResult,
      weeklyGenerationsResult
    ] = await Promise.all([
      // Total Users
      db.select({ count: sql<number>`count(*)` }).from(users),
      
      // Total Source Images (actual uploaded images)
      db.select({ count: sql<number>`count(*)` }).from(sourceImages),
      
      // Total Generations (AI-generated results)
      db.select({ count: sql<number>`count(*)` }).from(generations),
      
      // Active Admins
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin')),
      
      // Weekly Source Image Uploads
      db.select({ count: sql<number>`count(*)` })
        .from(sourceImages)
        .where(gte(sourceImages.createdAt, weekAgo)),
        
      // Weekly Generation Activity
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(gte(generations.createdAt, weekAgo))
    ])

    const stats = {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalSourceImages: totalSourceImagesResult[0]?.count || 0,
      totalGenerations: totalGenerationsResult[0]?.count || 0,
      // Legacy field for backwards compatibility
      totalImages: totalSourceImagesResult[0]?.count || 0,
      activeAdmins: activeAdminsResult[0]?.count || 0,
      weeklySourceImages: weeklySourceImagesResult[0]?.count || 0,
      weeklyGenerations: weeklyGenerationsResult[0]?.count || 0,
      // Legacy field for backwards compatibility
      weeklyActivity: (weeklySourceImagesResult[0]?.count || 0) + (weeklyGenerationsResult[0]?.count || 0)
    }

    return Response.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch admin stats' 
    }, { status: 500 })
  }
}