import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserProjects, logAdminProjectAction } from '@/lib/admin/user-project-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    // Validate userId parameter
    if (!userId) {
      return Response.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    // Verify the target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!targetUser) {
      return Response.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Fetch user's projects
    const projects = await getUserProjects(userId);

    // Log admin action
    await logAdminProjectAction(
      sessionResult.user!.id,
      'VIEW_USER_PROJECTS',
      'user_projects',
      userId,
      `Viewed projects for user: ${targetUser.email}`,
      {
        targetUserId: userId,
        targetUserEmail: targetUser.email,
        projectCount: projects.length
      },
      request
    );

    return Response.json({
      success: true,
      message: 'User projects retrieved successfully',
      data: {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          image: targetUser.image
        },
        projects
      }
    });

  } catch (error) {
    console.error('Admin user projects error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch user projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}