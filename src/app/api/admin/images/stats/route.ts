import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users, generations } from '@/db/schema';
import { eq, gte, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { 
  type ImageStatsResponse,
  type ApiResponse 
} from '@/lib/admin/image-schemas';
import { 
  getImageStatistics,
  logAdminImageAction 
} from '@/lib/admin/image-queries';

const StatsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30)
});

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const session = await validateApiSession(request);
    if (!session) {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id)
    });

    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const rawQuery = Object.fromEntries(url.searchParams);
    const queryValidation = StatsQuerySchema.safeParse(rawQuery);
    
    if (!queryValidation.success) {
      return Response.json({
        success: false,
        message: 'Invalid query parameters',
        error: queryValidation.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ')
      }, { status: 400 });
    }

    const query = queryValidation.data;

    // Set date range
    let dateRange: { start: Date; end: Date } | undefined;
    
    if (query.startDate || query.endDate) {
      dateRange = {
        start: query.startDate || new Date(Date.now() - query.days * 24 * 60 * 60 * 1000),
        end: query.endDate || new Date()
      };
    } else if (query.days) {
      dateRange = {
        start: new Date(Date.now() - query.days * 24 * 60 * 60 * 1000),
        end: new Date()
      };
    }

    // Get basic statistics
    const stats = await getImageStatistics(dateRange);

    // Get recent activity data (last 30 days by day)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentActivityData = await db
      .select({
        date: sql<string>`DATE_TRUNC('day', ${generations.createdAt})`,
        uploads: sql<number>`COUNT(DISTINCT ${generations.originalImagePath})`,
        completed: sql<number>`COUNT(CASE WHEN ${generations.status} = 'completed' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${generations.status} = 'failed' THEN 1 END)`
      })
      .from(generations)
      .where(gte(generations.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE_TRUNC('day', ${generations.createdAt})`)
      .orderBy(desc(sql`DATE_TRUNC('day', ${generations.createdAt})`))
      .limit(30);

    const recentActivity = recentActivityData.map(activity => ({
      date: new Date(activity.date),
      uploads: activity.uploads,
      completed: activity.completed,
      failed: activity.failed
    }));

    // Log admin action
    await logAdminImageAction(
      session.user.id,
      'VIEW_IMAGE_STATS',
      'admin_stats',
      'image_statistics',
      'Image Statistics Dashboard',
      {
        dateRange,
        totalImages: stats.totalImages,
        queryDays: query.days
      },
      request
    );

    const response: ApiResponse<ImageStatsResponse['data']> = {
      success: true,
      message: 'Image statistics retrieved successfully',
      data: {
        ...stats,
        recentActivity
      }
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin image stats error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch image statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}