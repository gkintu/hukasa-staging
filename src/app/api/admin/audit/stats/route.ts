import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { 
  type AuditStatsResponse,
  type ApiResponse 
} from '@/lib/admin/audit-schemas';
import { 
  getAuditStatistics,
  logAdminAuditAction 
} from '@/lib/admin/audit-queries';

const StatsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30)
});

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const sessionResult = await validateApiSession(request);
    if (!sessionResult.success || !sessionResult.user) {
      return Response.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionResult.user!.id)
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

    // Get audit statistics
    const stats = await getAuditStatistics(dateRange);

    // Log admin action
    await logAdminAuditAction(
      sessionResult.user!.id,
      'VIEW_AUDIT_LOGS',
      'audit_stats',
      'audit_statistics',
      'Audit Statistics Dashboard',
      {
        dateRange,
        totalActions: stats.totalActions,
        queryDays: query.days
      },
      undefined,
      request
    );

    const response: ApiResponse<AuditStatsResponse['data']> = {
      success: true,
      message: 'Audit statistics retrieved successfully',
      data: stats
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin audit stats error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch audit statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}