import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { signUrl } from '@/lib/signed-urls'

interface RefreshUrlsRequest {
  images: Array<{
    id: string
    path: string
  }>
  variants: Array<{
    id: string
    path: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const body: RefreshUrlsRequest = await request.json()

    // Validate request body
    if (!body.images || !Array.isArray(body.images) || !body.variants || !Array.isArray(body.variants)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request: images and variants arrays required'
      }, { status: 400 })
    }

    // Generate signed URLs with 1-hour expiry
    const expiresAt = Date.now() + (60 * 60 * 1000) // 1 hour

    // Generate URLs for source images
    const imageUrls: Record<string, string> = {}
    for (const image of body.images) {
      if (image.id && image.path) {
        imageUrls[image.id] = signUrl(image.path, userId, expiresAt)
      }
    }

    // Generate URLs for variants
    const variantUrls: Record<string, string | null> = {}
    for (const variant of body.variants) {
      if (variant.id) {
        // Only generate URL if variant has a valid path (completed variants)
        variantUrls[variant.id] = variant.path
          ? signUrl(variant.path, userId, expiresAt)
          : null
      }
    }

    return NextResponse.json({
      success: true,
      urls: {
        images: imageUrls,
        variants: variantUrls
      }
    })
  } catch (error) {
    console.error('Error refreshing URLs:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}