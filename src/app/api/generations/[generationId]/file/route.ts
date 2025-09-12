/**
 * Generation File Serving API
 * 
 * Industry-standard approach: /api/generations/{generationId}/file
 * Returns the generated variant image file by generation database ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { withAuth } from '@/lib/withAuth'
import { db } from '@/db'
import { generations, sourceImages } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const GET = withAuth(async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const generationId = pathSegments[pathSegments.length - 2] // [generationId]/file
  const isDownload = url.searchParams.get('download') === 'true'
  
  if (!generationId) {
    return NextResponse.json(
      { error: 'Invalid generation ID' },
      { status: 400 }
    )
  }

  try {
    // Get generation and verify user access through source image
    const generationRecord = await db.select({
      generation: generations,
      sourceImage: sourceImages
    })
      .from(generations)
      .leftJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
      .where(eq(generations.id, generationId))
      .limit(1)

    if (generationRecord.length === 0) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    const { generation, sourceImage } = generationRecord[0]
    
    if (!sourceImage) {
      return NextResponse.json(
        { error: 'Source image not found' },
        { status: 404 }
      )
    }

    // Check if user owns this generation through source image
    if (sourceImage.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Use the staged image path directly from the database
    const uploadPath = process.env.FILE_UPLOAD_PATH
    if (!uploadPath) {
      throw new Error('FILE_UPLOAD_PATH environment variable is required')
    }

    if (!generation.stagedImagePath) {
      return NextResponse.json(
        { error: 'Generation file path not found in database' },
        { status: 404 }
      )
    }

    // Construct full file path from database path
    const filePath = `${uploadPath}/${generation.stagedImagePath}`

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json(
        { error: 'Generation file not found on disk' },
        { status: 404 }
      )
    }

    // Read and serve the file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)

    // Determine MIME type from file extension
    const extension = filePath.split('.').pop() || ''
    const mimeType = getMimeTypeFromExtension(`.${extension}`)

    // Set response headers optimized for image serving
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=86400', // Cache for 24 hours
      'ETag': `"${generation.id}"`,
      'Last-Modified': stats.mtime.toUTCString(),
    }

    // Add download header if requested
    if (isDownload) {
      const filename = `${sourceImage.displayName || 'image'}-variant-${generation.variationIndex}${extension ? '.' + extension : ''}`
      headers['Content-Disposition'] = `attachment; filename="${filename}"`
    }

    return new NextResponse(new Uint8Array(fileBuffer), { headers })
    
  } catch (error) {
    console.error('Generation file serving error:', error)
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