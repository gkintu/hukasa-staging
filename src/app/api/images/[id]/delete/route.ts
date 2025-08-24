import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations } from '@/db/schema'
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
      .from(generations)
      .where(eq(generations.id, imageId))
      .limit(1)

    if (existingImage.length === 0) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    if (existingImage[0].userId !== userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    // Delete the image record from database
    // Note: We're not deleting the actual file from filesystem for now
    // This could be enhanced later to also remove the physical files
    await db
      .delete(generations)
      .where(eq(generations.id, imageId))

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}