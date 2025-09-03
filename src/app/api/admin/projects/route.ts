import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  ProjectListQuerySchema,
  type ProjectListQuery,
  type ApiResponse 
} from '@/lib/admin/project-schemas';
import { 
  getProjectsWithFilters,
  logAdminProjectAction 
} from '@/lib/admin/project-queries';

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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const rawQuery = Object.fromEntries(url.searchParams);
    
    const validationResult = ProjectListQuerySchema.safeParse(rawQuery);
    
    if (!validationResult.success) {
      return Response.json({
        success: false,
        message: 'Invalid query parameters',
        error: validationResult.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ')
      }, { status: 400 });
    }

    const query: ProjectListQuery = validationResult.data;

    // Fetch projects with filters
    const result = await getProjectsWithFilters(query);

    // Log admin action
    await logAdminProjectAction(
      session.user.id,
      'VIEW_PROJECTS_LIST',
      'admin_projects',
      'list',
      'Project Management List',
      {
        filters: query,
        resultCount: result.projects.length,
        totalCount: result.pagination.total
      },
      request
    );

    const response: ApiResponse = {
      success: true,
      message: 'Projects retrieved successfully',
      data: result
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin projects list error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}