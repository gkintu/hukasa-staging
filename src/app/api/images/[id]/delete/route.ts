import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
      .from(sourceImages)
      .where(eq(sourceImages.id, imageId))
      .limit(1)

    if (existingImage.length === 0) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    if (existingImage[0].userId !== userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    // Only delete from database - files will be cleaned up by cron job after 30 days
    // This allows users to contact support if they regret deleting images
    // Deleting source image will cascade delete any associated generations
    await db
      .delete(sourceImages)
      .where(eq(sourceImages.id, imageId))

    console.log(`Soft delete: Removed image ${imageId} from database, files preserved for recovery`)

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully',
      data: {
        imageId,
        note: 'Files preserved for potential recovery - will be auto-cleaned after 30 days'
      }
    })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}