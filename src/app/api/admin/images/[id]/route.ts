import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users, sourceImages, generations } from '@/db/schema';
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
      sessionResult.user!.id,
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
    let deleteOptions: ImageDelete = { 
      deleteVariants: false, 
      deleteSourceImage: false,
      deleteSourceFile: false 
    };
    
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
    let deletedSourceImage = false;

    // 3-Tier logical cascade system
    
    if (deleteOptions.deleteSourceFile) {
      // Tier 3: Delete source file (godmode - everything goes)
      
      // 1. Delete source file from storage
      try {
        const uploadPath = process.env.FILE_UPLOAD_PATH
        if (!uploadPath) {
          throw new Error('FILE_UPLOAD_PATH environment variable is required')
        }
        const sourceFilePath = path.join(process.cwd(), uploadPath, image.originalImagePath);
        await fs.unlink(sourceFilePath);
        deletedFiles.push(image.originalImagePath);
      } catch (error) {
        console.warn(`Failed to delete source file: ${image.originalImagePath}`, error);
      }

      // 2. Delete variant files from storage
      for (const variant of image.variants) {
        if (variant.stagedImagePath) {
          try {
            const uploadPath = process.env.FILE_UPLOAD_PATH
        if (!uploadPath) {
          throw new Error('FILE_UPLOAD_PATH environment variable is required')
        }
            const filePath = path.join(process.cwd(), uploadPath, variant.stagedImagePath);
            await fs.unlink(filePath);
            deletedFiles.push(variant.stagedImagePath);
          } catch (error) {
            console.warn(`Failed to delete variant file: ${variant.stagedImagePath}`, error);
          }
        }
      }

      // 3. Delete source image from database (cascade deletes variants)
      await db.delete(sourceImages).where(eq(sourceImages.id, imageId));
      deletedSourceImage = true;
      deletedVariants = image.variants.length; // All variants deleted by cascade

      // Clean up empty directories
      await cleanupEmptyDirectories(image.user.id);

    } else if (deleteOptions.deleteSourceImage) {
      // Tier 2: Delete source image from database (cascades variants, keep file)
      
      // 1. Delete variant files from storage
      for (const variant of image.variants) {
        if (variant.stagedImagePath) {
          try {
            const uploadPath = process.env.FILE_UPLOAD_PATH
        if (!uploadPath) {
          throw new Error('FILE_UPLOAD_PATH environment variable is required')
        }
            const filePath = path.join(process.cwd(), uploadPath, variant.stagedImagePath);
            await fs.unlink(filePath);
            deletedFiles.push(variant.stagedImagePath);
          } catch (error) {
            console.warn(`Failed to delete variant file: ${variant.stagedImagePath}`, error);
          }
        }
      }

      // 2. Delete source image from database (cascade deletes variants)
      await db.delete(sourceImages).where(eq(sourceImages.id, imageId));
      deletedSourceImage = true;
      deletedVariants = image.variants.length; // All variants deleted by cascade

    } else if (deleteOptions.deleteVariants) {
      // Tier 1: Delete variants only (keep source)
      const deletedResult = await db
        .delete(generations)
        .where(eq(generations.sourceImageId, imageId))
        .returning({ stagedImagePath: generations.stagedImagePath });
      
      deletedVariants = deletedResult.length;

      // Delete variant files from storage
      for (const variant of deletedResult) {
        if (variant.stagedImagePath) {
          try {
            const uploadPath = process.env.FILE_UPLOAD_PATH
        if (!uploadPath) {
          throw new Error('FILE_UPLOAD_PATH environment variable is required')
        }
            const filePath = path.join(process.cwd(), uploadPath, variant.stagedImagePath);
            await fs.unlink(filePath);
            deletedFiles.push(variant.stagedImagePath);
          } catch (error) {
            console.warn(`Failed to delete variant file: ${variant.stagedImagePath}`, error);
          }
        }
      }
    }

    // Log admin action
    await logAdminImageAction(
      sessionResult.user!.id,
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

    // Build descriptive response message
    const messageParts = [];
    if (deletedSourceImage) {
      messageParts.push('source image');
    }
    if (deletedVariants > 0) {
      messageParts.push(`${deletedVariants} variant(s)`);
    }
    if (deletedFiles.length > 0) {
      messageParts.push(`${deletedFiles.length} file(s)`);
    }
    
    const message = messageParts.length > 0 
      ? `Successfully deleted ${messageParts.join(', ')}`
      : 'No items were deleted (check your selection)';

    const response: ImageDeleteResponse = {
      success: true,
      message,
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

/**
 * Clean up empty directories after file deletion
 * Removes empty user directories recursively: sources/, generations/, and user folder if completely empty
 */
async function cleanupEmptyDirectories(userId: string): Promise<void> {
  try {
    const uploadPath = process.env.FILE_UPLOAD_PATH
    if (!uploadPath) {
      throw new Error('FILE_UPLOAD_PATH environment variable is required')
    }
    const userDir = path.join(process.cwd(), uploadPath, userId)
    const sourcesDir = path.join(userDir, 'sources')
    const generationsDir = path.join(userDir, 'generations')

    // Helper function to recursively remove empty directories
    async function removeEmptyDirRecursive(dirPath: string): Promise<boolean> {
      try {
        const contents = await fs.readdir(dirPath)
        
        // Process each item in the directory
        for (const item of contents) {
          const itemPath = path.join(dirPath, item)
          try {
            const stat = await fs.stat(itemPath)
            if (stat.isDirectory()) {
              // Recursively try to remove subdirectory
              await removeEmptyDirRecursive(itemPath)
            }
          } catch {
            // Skip items that can't be accessed
          }
        }
        
        // After processing contents, check if directory is now empty
        const newContents = await fs.readdir(dirPath)
        if (newContents.length === 0) {
          await fs.rmdir(dirPath)
          return true // Successfully removed
        }
        return false // Directory not empty
      } catch {
        // Directory doesn't exist or can't be accessed
        return false
      }
    }

    // Clean up sources directory
    await removeEmptyDirRecursive(sourcesDir)

    // Clean up generations directory
    await removeEmptyDirRecursive(generationsDir)

    // Clean up user directory if now empty
    await removeEmptyDirRecursive(userDir)
    
  } catch (error) {
    // Log but don't fail the operation for cleanup issues
    console.warn(`Failed to cleanup empty directories for user ${userId}:`, error)
  }
}