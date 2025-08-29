import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const { id: imageId } = await params

    // Check if the image exists and belongs to the user
    const existingImage = await db
      .select()
      .from(generations)
      .where(eq(generations.id, imageId))
      .limit(1)

    if (existingImage.length === 0) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    if (existingImage[0].userId !== userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    // Delete physical files before deleting database record
    const fileDeletionResults: { file: string; deleted: boolean; error?: string }[] = []
    
    // Delete original image file
    if (existingImage[0].originalImagePath) {
      try {
        const originalFilePath = join(process.cwd(), 'uploads', existingImage[0].originalImagePath)
        console.log('Attempting to delete original file at:', originalFilePath)
        console.log('Original image path from DB:', existingImage[0].originalImagePath)
        await fs.unlink(originalFilePath)
        fileDeletionResults.push({ file: 'original', deleted: true })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Failed to delete original image file:', errorMessage)
        fileDeletionResults.push({ 
          file: 'original', 
          deleted: false, 
          error: errorMessage 
        })
      }
    }
    
    // Delete staged/generated variant file if it exists
    if (existingImage[0].stagedImagePath) {
      try {
        const stagedFilePath = join(process.cwd(), 'uploads', existingImage[0].stagedImagePath)
        console.log('Attempting to delete staged file at:', stagedFilePath)
        console.log('Staged image path from DB:', existingImage[0].stagedImagePath)
        await fs.unlink(stagedFilePath)
        fileDeletionResults.push({ file: 'staged', deleted: true })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Failed to delete staged image file:', errorMessage)
        fileDeletionResults.push({ 
          file: 'staged', 
          deleted: false, 
          error: errorMessage 
        })
      }
    }

    // Delete the image record from database
    await db
      .delete(generations)
      .where(eq(generations.id, imageId))

    // Determine success based on file deletions
    const originalFileDeleted = !existingImage[0].originalImagePath || 
      fileDeletionResults.find(r => r.file === 'original')?.deleted === true
    
    const stagedFileDeleted = !existingImage[0].stagedImagePath || 
      fileDeletionResults.find(r => r.file === 'staged')?.deleted === true
    
    const allFilesDeleted = originalFileDeleted && stagedFileDeleted

    return NextResponse.json({ 
      success: true, 
      message: allFilesDeleted 
        ? 'Image and associated files deleted successfully'
        : 'Image deleted from database, but some files could not be removed',
      fileDeletionResults: fileDeletionResults.length > 0 ? fileDeletionResults : undefined
    })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}