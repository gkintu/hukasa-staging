import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  ImageListQuerySchema,
  type ImageListQuery,
  type ApiResponse 
} from '@/lib/admin/image-schemas';
import { 
  getImagesWithFilters,
  logAdminImageAction 
} from '@/lib/admin/image-queries';

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
    
    // Handle nested fileSize object from query params
    // Create a properly typed query object that can contain mixed types
    const queryData: Record<string, unknown> = { ...rawQuery };
    if (rawQuery.fileSizeMin || rawQuery.fileSizeMax) {
      queryData.fileSize = {
        min: rawQuery.fileSizeMin ? parseInt(rawQuery.fileSizeMin) : undefined,
        max: rawQuery.fileSizeMax ? parseInt(rawQuery.fileSizeMax) : undefined,
      };
      delete queryData.fileSizeMin;
      delete queryData.fileSizeMax;
    }

    const validationResult = ImageListQuerySchema.safeParse(queryData);
    
    if (!validationResult.success) {
      return Response.json({
        success: false,
        message: 'Invalid query parameters',
        error: validationResult.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ')
      }, { status: 400 });
    }

    const query: ImageListQuery = validationResult.data;

    // Fetch images with filters
    const result = await getImagesWithFilters(query);

    // Log admin action
    await logAdminImageAction(
      sessionResult.user!.id,
      'VIEW_IMAGES_LIST',
      'admin_images',
      'list',
      'Image Management List',
      {
        filters: query,
        resultCount: result.images.length,
        totalCount: result.pagination.total
      },
      request
    );

    const response: ApiResponse = {
      success: true,
      message: 'Images retrieved successfully',
      data: result
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin images list error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch images',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}