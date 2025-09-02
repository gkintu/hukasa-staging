import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users, generations, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  BulkOperationSchema,
  type BulkOperation,
  type BulkOperationResponse 
} from '@/lib/admin/image-schemas';
import { 
  getBulkImagesByIds,
  logAdminImageAction 
} from '@/lib/admin/image-queries';

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = BulkOperationSchema.safeParse(body);
    
    if (!validation.success) {
      return Response.json({
        success: false,
        message: 'Invalid request body',
        error: validation.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ')
      }, { status: 400 });
    }

    const operation: BulkOperation = validation.data;

    // Get images to operate on
    const images = await getBulkImagesByIds(operation.imageIds);
    
    if (images.length === 0) {
      return Response.json({
        success: false,
        message: 'No images found for the provided IDs'
      }, { status: 404 });
    }

    const results = [];
    let processedCount = 0;
    let failedCount = 0;

    // Process each image based on the action
    for (const image of images) {
      try {
        switch (operation.action) {
          case 'delete':
            await handleBulkDelete(image);
            break;
          
          case 'reprocess':
            await handleBulkReprocess(image);
            break;
          
          case 'move_project':
            if (!operation.targetProjectId) {
              throw new Error('Target project ID is required for move operation');
            }
            await handleBulkMoveProject(image, operation.targetProjectId);
            break;
          
          case 'update_status':
            // This would typically be used for manual status updates
            // Implementation depends on specific requirements
            throw new Error('Status update not implemented yet');
          
          default:
            throw new Error(`Unknown action: ${operation.action}`);
        }

        results.push({
          imageId: image.id,
          success: true
        });
        processedCount++;

      } catch (error) {
        results.push({
          imageId: image.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failedCount++;
      }
    }

    // Log admin action
    await logAdminImageAction(
      session.user.id,
      `BULK_${operation.action.toUpperCase()}`,
      'bulk_images',
      'multiple',
      `Bulk ${operation.action}`,
      {
        action: operation.action,
        imageCount: operation.imageIds.length,
        processedCount,
        failedCount,
        targetProjectId: operation.targetProjectId,
        reason: operation.reason
      },
      request
    );

    const response: BulkOperationResponse = {
      success: failedCount === 0,
      message: `Bulk ${operation.action} completed: ${processedCount} processed, ${failedCount} failed`,
      data: {
        processed: processedCount,
        failed: failedCount,
        details: results
      }
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin bulk operation error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to perform bulk operation',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for bulk operations
async function handleBulkDelete(image: { id: string }) {
  // Delete the generation record
  await db.delete(generations).where(eq(generations.id, image.id));
  
  // TODO: Delete associated files if this is the last variant
  // This would require checking if other variants exist and cleaning up files
}

async function handleBulkReprocess(image: { id: string }) {
  // Update status to pending for reprocessing
  await db
    .update(generations)
    .set({ 
      status: 'pending',
      errorMessage: null,
      processingTimeMs: null,
      completedAt: null
    })
    .where(eq(generations.id, image.id));
    
  // TODO: Add to processing queue
  // This would typically involve queuing the image for background processing
}

async function handleBulkMoveProject(image: { id: string }, targetProjectId: string) {
  // Verify target project exists
  const targetProject = await db.query.projects.findFirst({
    where: eq(projects.id, targetProjectId)
  });
  
  if (!targetProject) {
    throw new Error(`Target project ${targetProjectId} not found`);
  }

  // Update the generation's project
  await db
    .update(generations)
    .set({ 
      projectId: targetProjectId
    })
    .where(eq(generations.id, image.id));
}