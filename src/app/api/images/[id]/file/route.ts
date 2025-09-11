/**
 * Source Image File Serving API Route
 * 
 * Serves source images by database ID using the new hierarchical structure
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { withAuth } from '@/lib/withAuth'
import { db } from '@/db'
import { sourceImages } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const GET = withAuth(async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const id = pathSegments[pathSegments.length - 2] // [id]/file
  
  // Validate id format
  if (!id) {
    return NextResponse.json(
      { error: 'Invalid source image ID' },
      { status: 400 }
    )
  }

  try {
    // Get source image from database
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
    
    // Check if user owns this image (or is admin)
    if (sourceImage.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Construct file path using new structure: {userId}/{sourceImageId}/source.ext
    const uploadPath = process.env.FILE_UPLOAD_PATH
    if (!uploadPath) {
      throw new Error('FILE_UPLOAD_PATH environment variable is required')
    }

    // Try different extensions to find the actual file
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    let filePath: string | null = null
    let actualExtension = ''

    for (const ext of extensions) {
      const testPath = `${uploadPath}/${sourceImage.userId}/${id}/source${ext}`
      try {
        await fs.access(testPath)
        filePath = testPath
        actualExtension = ext
        break
      } catch {
        // File doesn't exist with this extension, try next
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'Source image file not found on disk' },
        { status: 404 }
      )
    }

    // Read and serve the file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)

    // Determine MIME type
    const mimeType = getMimeTypeFromExtension(actualExtension)

    // Set response headers
    const headers = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=3600',
      'ETag': `"${id}"`,
      'Last-Modified': stats.mtime.toUTCString(),
    }

    return new NextResponse(new Uint8Array(fileBuffer), { headers })
    
  } catch (error) {
    console.error('Source image file serving error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

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