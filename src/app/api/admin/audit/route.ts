import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  AuditListQuerySchema,
  type AuditListResponse,
  type ApiResponse 
} from '@/lib/admin/audit-schemas';
import { 
  getAuditLogsWithFilters,
  logAdminAuditAction 
} from '@/lib/admin/audit-queries';

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
    const queryValidation = AuditListQuerySchema.safeParse(rawQuery);
    
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

    // Get audit logs
    const result = await getAuditLogsWithFilters(query);

    // Log admin action
    await logAdminAuditAction(
      sessionResult.user!.id,
      'VIEW_AUDIT_LOGS',
      'audit_logs',
      'audit_list',
      'Audit Logs List',
      {
        filters: query,
        resultCount: result.logs.length
      },
      undefined,
      request
    );

    const response: ApiResponse<AuditListResponse['data']> = {
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin audit logs error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch audit logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}