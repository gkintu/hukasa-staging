import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, generations } from '@/db/schema'
import { eq, sql, gte } from 'drizzle-orm'
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

    // Get activity distribution by hour of day (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const hourlyActivity = await db
      .select({
        hour: sql<number>`EXTRACT(hour FROM created_at)`,
        count: sql<number>`count(*)`
      })
      .from(generations)
      .where(gte(generations.createdAt, weekAgo))
      .groupBy(sql`EXTRACT(hour FROM created_at)`)
      .orderBy(sql`EXTRACT(hour FROM created_at)`)

    // Fill in missing hours with 0 counts
    const chartData = []
    for (let hour = 0; hour < 24; hour++) {
      const existingData = hourlyActivity.find(d => d.hour === hour)
      chartData.push({
        hour: hour.toString().padStart(2, '0') + ':00',
        activity: existingData?.count || 0
      })
    }

    return Response.json({
      success: true,
      data: chartData
    })

  } catch (error) {
    console.error('Activity distribution chart error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch activity distribution data' 
    }, { status: 500 })
  }
}