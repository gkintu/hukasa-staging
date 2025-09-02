import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users, generations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { 
  ImageDeleteSchema,
  type ImageDelete,
  type ImageDeleteResponse,
  type ApiResponse 
} from '@/lib/admin/image-schemas';
import { 
  getImageById,
  logAdminImageAction 
} from '@/lib/admin/image-queries';
import fs from 'fs/promises';
import path from 'path';

const ParamsSchema = z.object({
  id: z.string().uuid()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validate params
    const { id: imageId } = await params;
    const paramValidation = ParamsSchema.safeParse({ id: imageId });
    
    if (!paramValidation.success) {
      return Response.json({
        success: false,
        message: 'Invalid image ID format'
      }, { status: 400 });
    }

    // Get image details
    const image = await getImageById(imageId);
    
    if (!image) {
      return Response.json({
        success: false,
        message: 'Image not found'
      }, { status: 404 });
    }

    // Log admin action
    await logAdminImageAction(
      session.user.id,
      'VIEW_IMAGE_DETAIL',
      'image',
      imageId,
      image.originalFileName,
      {
        projectId: image.projectId,
        variantCount: image.variants.length
      },
      request
    );

    const response: ApiResponse = {
      success: true,
      message: 'Image retrieved successfully',
      data: image
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin image detail error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to fetch image details',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validate params
    const { id: imageId } = await params;
    const paramValidation = ParamsSchema.safeParse({ id: imageId });
    
    if (!paramValidation.success) {
      return Response.json({
        success: false,
        message: 'Invalid image ID format'
      }, { status: 400 });
    }

    // Parse request body
    let deleteOptions: ImageDelete = { deleteVariants: true, deleteSourceFile: false };
    
    try {
      const body = await request.json();
      const bodyValidation = ImageDeleteSchema.safeParse(body);
      
      if (!bodyValidation.success) {
        return Response.json({
          success: false,
          message: 'Invalid request body',
          error: bodyValidation.error.issues.map(issue => 
            `${issue.path.join('.')}: ${issue.message}`
          ).join(', ')
        }, { status: 400 });
      }
      
      deleteOptions = bodyValidation.data;
    } catch {
      // Use default options if no body provided
    }

    // Get image details before deletion
    const image = await getImageById(imageId);
    
    if (!image) {
      return Response.json({
        success: false,
        message: 'Image not found'
      }, { status: 404 });
    }

    const deletedFiles: string[] = [];
    let deletedVariants = 0;

    // Delete from database
    if (deleteOptions.deleteVariants) {
      // Delete all variants for this source image
      const deletedResult = await db
        .delete(generations)
        .where(eq(generations.originalImagePath, image.originalImagePath))
        .returning({ id: generations.id, stagedImagePath: generations.stagedImagePath });
      
      deletedVariants = deletedResult.length;

      // Delete staged image files
      for (const variant of deletedResult) {
        if (variant.stagedImagePath) {
          try {
            const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
            const filePath = path.join(process.cwd(), uploadPath, variant.stagedImagePath);
            await fs.unlink(filePath);
            deletedFiles.push(variant.stagedImagePath);
          } catch (error) {
            console.warn(`Failed to delete staged image file: ${variant.stagedImagePath}`, error);
          }
        }
      }
    } else {
      // Delete only the specific variant
      const deletedResult = await db
        .delete(generations)
        .where(eq(generations.id, imageId))
        .returning({ stagedImagePath: generations.stagedImagePath });

      if (deletedResult.length > 0) {
        deletedVariants = 1;
        const stagedImagePath = deletedResult[0].stagedImagePath;
        
        if (stagedImagePath) {
          try {
            const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
            const filePath = path.join(process.cwd(), uploadPath, stagedImagePath);
            await fs.unlink(filePath);
            deletedFiles.push(stagedImagePath);
          } catch (error) {
            console.warn(`Failed to delete staged image file: ${stagedImagePath}`, error);
          }
        }
      }
    }

    // Delete source file if requested and no other variants exist
    if (deleteOptions.deleteSourceFile) {
      // Check if there are other variants remaining
      const remainingVariants = await db
        .select({ id: generations.id })
        .from(generations)
        .where(eq(generations.originalImagePath, image.originalImagePath))
        .limit(1);

      if (remainingVariants.length === 0) {
        try {
          // Fix file path construction - files are stored in uploads/{userId}/{filename}
          const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
          const sourceFilePath = path.join(process.cwd(), uploadPath, image.originalImagePath);
          await fs.unlink(sourceFilePath);
          deletedFiles.push(image.originalImagePath);
        } catch (error) {
          console.warn(`Failed to delete source image file: ${image.originalImagePath}`, error);
        }
      }
    }

    // Log admin action
    await logAdminImageAction(
      session.user.id,
      'DELETE_IMAGE',
      'image',
      imageId,
      image.originalFileName,
      {
        deleteOptions,
        deletedVariants,
        deletedFiles: deletedFiles.length,
        reason: deleteOptions.reason
      },
      request
    );

    const response: ImageDeleteResponse = {
      success: true,
      message: `Successfully deleted ${deletedVariants} variant(s) and ${deletedFiles.length} file(s)`,
      data: {
        imageId,
        deletedVariants,
        deletedFiles
      }
    };

    return Response.json(response);

  } catch (error) {
    console.error('Admin image deletion error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to delete image',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}