import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages, generations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'
import { signUrl } from '@/lib/signed-urls'

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
    const updatedImage = await db
      .update(sourceImages)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(sourceImages.id, imageId))
      .returning()

    // Get variants for this image
    const variants = await db
      .select()
      .from(generations)
      .where(eq(generations.sourceImageId, imageId))

    const projectId = updatedImage[0].projectId

    // Invalidate user's image metadata cache and project detail
    await Promise.all([
      valkey.del(CacheKeys.userImagesMetadata(userId)),
      valkey.del(CacheKeys.userProject(userId, projectId)) // Project detail changed (displayName updated)
    ])

    // Generate fresh signed URLs (1-hour expiry)
    const expiresAt = Date.now() + (60 * 60 * 1000)
    const imageWithUrls = {
      ...updatedImage[0],
      signedUrl: signUrl(updatedImage[0].originalImagePath, userId, expiresAt),
      variants: variants.map(variant => ({
        ...variant,
        signedUrl: variant.stagedImagePath
          ? signUrl(variant.stagedImagePath, userId, expiresAt)
          : null
      }))
    }

    return NextResponse.json({
      success: true,
      message: 'Display name updated successfully',
      data: imageWithUrls
    })
  } catch (error) {
    console.error('Error updating display name:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}