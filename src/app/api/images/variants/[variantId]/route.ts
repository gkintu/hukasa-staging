import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations, sourceImages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'

/**
 * DELETE /api/images/variants/[variantId]
 * 
 * User endpoint for deleting individual variants
 * - DB-only deletion (keeps files for support recovery)
 * - User must own the source image
 * - Follows separation of concerns pattern
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const { variantId } = await params
    const session = await validateApiSession(request)
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Verify user owns this variant by checking the source image ownership
    const variantWithOwnership = await db
      .select({
        variantId: generations.id,
        sourceImageId: generations.sourceImageId,
        sourceImageUserId: sourceImages.userId,
        stagedImagePath: generations.stagedImagePath
      })
      .from(generations)
      .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
      .where(eq(generations.id, variantId))
      .limit(1)

    if (variantWithOwnership.length === 0) {
      return NextResponse.json({ success: false, message: 'Variant not found' }, { status: 404 })
    }

    const variant = variantWithOwnership[0]
    
    if (variant.sourceImageUserId !== userId) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    // Delete from database only (keep file for support recovery)
    const deletedVariant = await db
      .delete(generations)
      .where(eq(generations.id, variantId))
      .returning({ id: generations.id })

    if (deletedVariant.length === 0) {
      return NextResponse.json({ success: false, message: 'Failed to delete variant' }, { status: 500 })
    }

    const sourceImageId = variant.sourceImageId

    // Invalidate user's image cache (contains all variants)
    await Promise.all([
      valkey.del(CacheKeys.userImagesMetadata(userId)),
      valkey.del(CacheKeys.imageVariants(sourceImageId)) // Image variants cache changed
    ])

    return NextResponse.json({
      success: true,
      message: 'Variant deleted successfully (file kept for support recovery)',
      data: {
        variantId,
        sourceImageId: variant.sourceImageId
      }
    })

  } catch (error) {
    console.error('Error deleting variant:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete variant' },
      { status: 500 }
    )
  }
}