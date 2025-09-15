import { NextRequest } from 'next/server';
import { validateApiSession } from '@/lib/auth-utils';
import { db } from '@/db';
import { users, projects, sourceImages, generations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { AdvancedDelete } from '@/lib/shared/schemas/delete-schemas';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params;
    const projectId = params.id;

    // Parse delete options from request body
    let deleteOptions: AdvancedDelete = {
      deleteVariants: false,
      deleteSourceImage: false,
      deleteSourceFile: false
    };

    try {
      const body = await request.json();
      deleteOptions = {
        deleteVariants: body.deleteVariants ?? false,
        deleteSourceImage: body.deleteSourceImage ?? false,
        deleteSourceFile: body.deleteSourceFile ?? false,
        reason: body.reason
      };
    } catch {
      // If no body or invalid JSON, use defaults
    }

    // Validate project ID
    if (!projectId) {
      return Response.json({
        success: false,
        message: 'Project ID is required'
      }, { status: 400 });
    }

    // Check if project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        user: {
          columns: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!project) {
      return Response.json({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    // Get all source images and their generations for this project
    const sourceImagesData = await db
      .select({
        id: sourceImages.id,
        originalImagePath: sourceImages.originalImagePath,
        userId: sourceImages.userId,
      })
      .from(sourceImages)
      .where(eq(sourceImages.projectId, projectId));

    const generationsData = await db
      .select({
        id: generations.id,
        stagedImagePath: generations.stagedImagePath,
        sourceImageId: generations.sourceImageId,
      })
      .from(generations)
      .where(eq(generations.projectId, projectId));

    // Track deletion results
    const deletionResults = {
      sourceImages: sourceImagesData.length,
      generations: generationsData.length,
      filesDeleted: [] as string[],
      fileErrors: [] as string[],
    };

    // Delete physical files based on user selection
    const uploadPath = process.env.FILE_UPLOAD_PATH
    if (!uploadPath) {
      throw new Error('FILE_UPLOAD_PATH environment variable is required')
    }

    // Delete source image files only if deleteSourceFile is true
    if (deleteOptions.deleteSourceFile) {
      for (const sourceImage of sourceImagesData) {
        try {
          const pathParts = sourceImage.originalImagePath.split('/');
          const physicalFilename = pathParts[pathParts.length - 1];
          const userDirectoryFromPath = pathParts.length > 1 ? pathParts[pathParts.length - 2] : sourceImage.userId;
          const filePath = join(uploadPath, userDirectoryFromPath, physicalFilename);
          
          await fs.access(filePath);
          await fs.unlink(filePath);
          deletionResults.filesDeleted.push(sourceImage.originalImagePath);
        } catch (error) {
          console.warn(`Failed to delete source image file: ${sourceImage.originalImagePath}`, error);
          deletionResults.fileErrors.push(sourceImage.originalImagePath);
        }
      }
    }

    // Delete generated/staged image files only if deleteVariants is true
    if (deleteOptions.deleteVariants) {
      for (const generation of generationsData) {
        if (generation.stagedImagePath) {
          try {
            const pathParts = generation.stagedImagePath.split('/');
            const physicalFilename = pathParts[pathParts.length - 1];
            const userDirectoryFromPath = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'unknown';
            const filePath = join(uploadPath, userDirectoryFromPath, physicalFilename);
            
            await fs.access(filePath);
            await fs.unlink(filePath);
            deletionResults.filesDeleted.push(generation.stagedImagePath);
          } catch (error) {
            console.warn(`Failed to delete staged image file: ${generation.stagedImagePath}`, error);
            deletionResults.fileErrors.push(generation.stagedImagePath);
          }
        }
      }
    }

    // Delete from database based on user selection
    if (deleteOptions.deleteVariants) {
      // Delete generations first
      if (generationsData.length > 0) {
        await db.delete(generations).where(eq(generations.projectId, projectId));
      }

      // Delete source images
      if (sourceImagesData.length > 0) {
        await db.delete(sourceImages).where(eq(sourceImages.projectId, projectId));
      }
    } else {
      // If not deleting variants, we need to reassign source images to "Unassigned Images" project
      // First, find the unassigned project for the user
      const sourceImageOwners = [...new Set(sourceImagesData.map(img => img.userId))];
      
      for (const ownerId of sourceImageOwners) {
        // Find or create unassigned project for this user
        const unassignedProject = await db.query.projects.findFirst({
          where: and(eq(projects.userId, ownerId), eq(projects.name, "📥 Unassigned Images")),
        });

        if (unassignedProject) {
          // Move source images to unassigned project
          await db.update(sourceImages)
            .set({ projectId: unassignedProject.id })
            .where(and(eq(sourceImages.projectId, projectId), eq(sourceImages.userId, ownerId)));
        }
      }
    }

    // Always delete the project itself
    await db.delete(projects).where(eq(projects.id, projectId));

    // Log comprehensive admin action
    console.log('Admin Project Deletion:', {
      adminId: sessionResult.user!.id,
      adminEmail: sessionResult.user!.email,
      projectId,
      projectName: project.name,
      projectOwner: project.user.email,
      deleteOptions,
      deletionResults,
      timestamp: new Date().toISOString(),
    });

    const action = deleteOptions.deleteVariants ? 'deleted' : 'moved to unassigned';
    const fileAction = deleteOptions.deleteSourceFile ? 'deleted' : 'preserved';
    
    return Response.json({
      success: true,
      message: `Project "${project.name}" deleted successfully`,
      data: {
        projectId,
        projectName: project.name,
        deleteOptions,
        sourceImagesDeleted: deleteOptions.deleteVariants ? deletionResults.sourceImages : 0,
        generationsDeleted: deleteOptions.deleteVariants ? deletionResults.generations : 0,
        sourceImagesPreserved: deleteOptions.deleteVariants ? 0 : deletionResults.sourceImages,
        filesDeleted: deletionResults.filesDeleted.length,
        fileErrors: deletionResults.fileErrors.length,
        summary: `Project deleted. Images ${action}, files ${fileAction}. ${deletionResults.filesDeleted.length} physical files processed.`,
      }
    });

  } catch (error) {
    console.error('Admin project deletion error:', error);
    return Response.json({ 
      success: false, 
      message: 'Failed to delete project',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}