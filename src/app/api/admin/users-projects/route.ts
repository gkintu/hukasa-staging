import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  getUsersWithProjectStats,
  logAdminProjectAction 
} from '@/lib/admin/user-project-queries';
import { 
  UserProjectListQuerySchema,
  type UserProjectListQuery,
  type ApiResponse 
} from '@/lib/admin/user-project-schemas';

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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const rawQuery = Object.fromEntries(url.searchParams);
    
    const validationResult = UserProjectListQuerySchema.safeParse(rawQuery);
    
    if (!validationResult.success) {
      return Response.json({
        success: false,
        message: 'Invalid query parameters',
        error: validationResult.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ')
      }, { status: 400 });
    }

    const query: UserProjectListQuery = validationResult.data;

    // Fetch users with project stats
    const result = await getUsersWithProjectStats(query);

    // Log admin action
    await logAdminProjectAction(
      sessionResult.user!.id,
      'VIEW_USERS_PROJECTS_LIST',
      'admin_users_projects',
      'list',
      'User Projects Management List',
      {
        filters: query,
        resultCount: result.users.length,
        totalCount: result.pagination.total
      },
      request
    );

    const response: ApiResponse = {
      success: true,
      message: 'Users with projects retrieved successfully',
      data: result
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin users projects list error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch users with projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}