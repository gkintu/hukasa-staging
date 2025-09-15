import { NextRequest } from 'next/server'
import { db } from '@/db/index'
import { users, sourceImages } from '@/db/schema'
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

    // Get last 30 days of source image uploads
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyUploads = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: sql<number>`count(*)`
      })
      .from(sourceImages)
      .where(gte(sourceImages.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`)

    // Fill in missing dates with 0 counts
    const chartData = []
    const currentDate = new Date(thirtyDaysAgo)
    const today = new Date()

    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split('T')[0]
      const existingData = dailyUploads.find(d => d.date === dateString)
      
      chartData.push({
        date: dateString,
        images: existingData?.count || 0,
        // Format for display
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
    console.error('Image upload chart error:', error)
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch image upload data' 
    }, { status: 500 })
  }
}