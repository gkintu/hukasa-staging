import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'

const renameSchema = z.object({
  displayName: z.string().min(1).max(255)
})

export async function PATCH(
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

    // Validate request body
    const body = await request.json()
    const result = renameSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid display name. Must be 1-255 characters.' 
      }, { status: 400 })
    }

    const { displayName } = result.data

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

    // Update the display name
    await db
      .update(sourceImages)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(sourceImages.id, imageId))

    // Invalidate user's image metadata cache
    await valkey.del(CacheKeys.userImagesMetadata(userId))

    return NextResponse.json({
      success: true,
      message: 'Display name updated successfully',
      displayName
    })
  } catch (error) {
    console.error('Error updating display name:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}