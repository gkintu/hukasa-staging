import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, generations } from '@/db/schema'
import { eq, sql, gte, and, isNotNull } from 'drizzle-orm'
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

    // Get processing times for completed images (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const processingTimes = await db
      .select({
        date: sql<string>`DATE(completed_at)`,
        avgTime: sql<number>`AVG(processing_time_ms)`,
        count: sql<number>`COUNT(*)`
      })
      .from(generations)
      .where(
        and(
          gte(generations.completedAt, thirtyDaysAgo),
          isNotNull(generations.processingTimeMs),
          eq(generations.status, 'completed')
        )
      )
      .groupBy(sql`DATE(completed_at)`)
      .orderBy(sql`DATE(completed_at)`)

    // Fill in missing dates with null values
    const chartData = []
    const currentDate = new Date(thirtyDaysAgo)
    const today = new Date()

    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split('T')[0]
      const existingData = processingTimes.find(d => d.date === dateString)
      
      chartData.push({
        date: dateString,
        avgTime: existingData?.avgTime ? Math.round(existingData.avgTime / 1000) : null, // Convert to seconds
        count: existingData?.count || 0,
        label: currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return Response.json({
      success: true,
      data: chartData
    })

  } catch (error) {
    console.error('Processing time chart error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch processing time data' 
    }, { status: 500 })
  }
}