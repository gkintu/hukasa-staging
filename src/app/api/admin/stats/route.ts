import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, generations } from '@/db/schema'
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
      totalImagesResult,
      activeAdminsResult,
      weeklyActivityResult
    ] = await Promise.all([
      // Total Users
      db.select({ count: sql<number>`count(*)` }).from(users),
      
      // Total Images
      db.select({ count: sql<number>`count(*)` }).from(generations),
      
      // Active Admins
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin')),
      
      // Weekly Activity (generations + logins in last 7 days)
      db.select({ count: sql<number>`count(*)` })
        .from(generations)
        .where(gte(generations.createdAt, weekAgo))
    ])

    const stats = {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalImages: totalImagesResult[0]?.count || 0,
      activeAdmins: activeAdminsResult[0]?.count || 0,
      weeklyActivity: weeklyActivityResult[0]?.count || 0
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