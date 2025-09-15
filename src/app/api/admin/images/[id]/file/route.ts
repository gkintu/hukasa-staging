/**
 * Admin Image File Serving API Route
 *
 * Serves source images by database ID for admin users
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { users, sourceImages } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate admin session
    const sessionResult = await validateApiSession(request)
    if (!sessionResult.success || !sessionResult.user) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 })
    }

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionResult.user!.id)
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 403 })
    }

    const { id } = await params
    const url = new URL(request.url)
    const isDownload = url.searchParams.get('download') === 'true'

    // Validate id format
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid source image ID' },
        { status: 400 }
      )
    }

    // Get source image from database (admin can access any image)
    const sourceImageRecord = await db.select()
      .from(sourceImages)
      .where(eq(sourceImages.id, id))
      .limit(1)

    if (sourceImageRecord.length === 0) {
      return NextResponse.json(
        { error: 'Source image not found' },
        { status: 404 }
      )
    }

    const sourceImage = sourceImageRecord[0]

    // Use stored path from database (S3-migration ready)
    const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'

    if (!sourceImage.originalImagePath) {
      return NextResponse.json(
        { error: 'Image path not found in database' },
        { status: 404 }
      )
    }

    // Validate stored path doesn't contain path traversal attempts
    if (sourceImage.originalImagePath.includes('..') ||
        sourceImage.originalImagePath.includes('~') ||
        sourceImage.originalImagePath.startsWith('/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      )
    }

    // Build full file path from stored relative path
    const filePath = `${uploadPath}/${sourceImage.originalImagePath}`

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json(
        { error: 'Source image file not found on disk' },
        { status: 404 }
      )
    }

    // Get file extension from stored path
    const actualExtension = sourceImage.originalImagePath.split('.').pop() || ''

    // Read and serve the file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)

    // Determine MIME type
    const mimeType = getMimeTypeFromExtension(actualExtension)

    // Set response headers
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=3600',
      'ETag': `"${id}"`,
      'Last-Modified': stats.mtime.toUTCString(),
    }

    // Add download header if requested
    if (isDownload) {
      const filename = sourceImage.display_name || `image-${id}${actualExtension}`
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    return new NextResponse(new Uint8Array(fileBuffer), { headers })

  } catch (error) {
    console.error('Admin image file serving error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getMimeTypeFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}