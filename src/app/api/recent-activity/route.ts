import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages, generations, projects } from '@/db/schema'
import { eq, desc, and, or, isNotNull, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    
    // Get recent image uploads (last 10)
    const recentUploads = await db
      .select({
        id: sourceImages.id,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        createdAt: sourceImages.createdAt,
        projectName: projects.name,
        type: sql<string>`'upload'`
      })
      .from(sourceImages)
      .innerJoin(projects, eq(sourceImages.projectId, projects.id))
      .where(eq(sourceImages.userId, userId))
      .orderBy(desc(sourceImages.createdAt))
      .limit(5)

    // Get recent generation completions (last 10)
    const recentCompletions = await db
      .select({
        id: generations.id,
        sourceImageId: generations.sourceImageId,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        completedAt: generations.completedAt,
        processingTimeMs: generations.processingTimeMs,
        variationIndex: generations.variationIndex,
        projectName: projects.name,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        type: sql<string>`'completion'`
      })
      .from(generations)
      .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(
        and(
          eq(generations.userId, userId),
          eq(generations.status, 'completed'),
          isNotNull(generations.completedAt)
        )
      )
      .orderBy(desc(generations.completedAt))
      .limit(5)

    // Get recent generation starts (processing) - active ones
    const recentProcessing = await db
      .select({
        id: generations.id,
        sourceImageId: generations.sourceImageId,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        createdAt: generations.createdAt,
        variationIndex: generations.variationIndex,
        projectName: projects.name,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        type: sql<string>`'processing'`
      })
      .from(generations)
      .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(
        and(
          eq(generations.userId, userId),
          or(
            eq(generations.status, 'pending'),
            eq(generations.status, 'processing')
          )
        )
      )
      .orderBy(desc(generations.createdAt))
      .limit(3)

    // Combine and sort all activities by timestamp
    const allActivities = [
      ...recentUploads.map(item => ({
        ...item,
        timestamp: item.createdAt,
        message: `New image "${item.displayName || item.originalFileName}" uploaded`,
        subtitle: `Added to ${item.projectName}`,
        status: 'success' as const
      })),
      ...recentCompletions.map(item => ({
        ...item,
        timestamp: item.completedAt!,
        message: `${String(item.roomType).replace('_', ' ')} staging completed`,
        subtitle: `${item.displayName || item.originalFileName} • ${item.stagingStyle} style • ${item.processingTimeMs ? Math.round(Number(item.processingTimeMs) / 1000) : '?'}s`,
        status: 'success' as const
      })),
      ...recentProcessing.map(item => ({
        ...item,
        timestamp: item.createdAt,
        message: `${String(item.roomType).replace('_', ' ')} staging in progress`,
        subtitle: `${item.displayName || item.originalFileName} • ${item.stagingStyle} style`,
        status: 'processing' as const
      }))
    ]

    // Sort by timestamp descending and take most recent 8
    const sortedActivities = allActivities
      .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime())
      .slice(0, 8)
      .map(activity => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        subtitle: activity.subtitle,
        timestamp: activity.timestamp,
        status: activity.status,
        relativeTime: formatRelativeTime(new Date(String(activity.timestamp)))
      }))

    return NextResponse.json({ 
      success: true, 
      activities: sortedActivities 
    })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }
}