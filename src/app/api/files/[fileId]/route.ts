/**
 * Secure File Serving API Route
 * 
 * Provides authenticated access to uploaded files with proper security controls.
 * Supports file metadata retrieval, direct file serving, and access logging.
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { withAuth } from '@/lib/withAuth'


/**
 * GET /api/files/[fileId]
 * 
 * Serves files with authentication and access control
 * Supports query parameters:
 * - metadata: Return file metadata instead of file content
 * - download: Force download instead of inline display
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const fileId = pathSegments[pathSegments.length - 1]
  
  // Validate fileId format
  if (!fileId || fileId === '[fileId]') {
    return NextResponse.json(
      { error: 'Invalid file ID' },
      { status: 400 }
    )
  }

  try {
    // Parse query parameters
    const { searchParams } = url
    const metadataOnly = searchParams.get('metadata') === 'true'
    const forceDownload = searchParams.get('download') === 'true'

    // For now, serve files directly from the file system
    // This will be replaced with the full file service once circular imports are resolved
    const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
    const userId = user.id
    
    // Basic security: ensure file belongs to the user
    const userDir = join(uploadPath, userId)
    
    // Try different extensions
    const extensions = ['.jpg', '.jpeg', '.png', '.webp']
    let filePath: string | null = null
    let actualExtension = ''
    
    for (const ext of extensions) {
      const testPath = join(userDir, `${fileId}${ext}`)
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
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check if user wants metadata only
    if (metadataOnly) {
      const stats = await fs.stat(filePath)
      return NextResponse.json({
        success: true,
        metadata: {
          id: fileId,
          size: stats.size,
          uploadedAt: stats.birthtime,
          mimeType: getMimeTypeFromExtension(actualExtension)
        }
      })
    }

    // Serve the actual file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)
    
    // Determine content disposition
    const disposition = forceDownload ? 'attachment' : 'inline'
    const filename = `${fileId}${actualExtension}`
    
    // Create response with appropriate headers
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': getMimeTypeFromExtension(actualExtension),
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'ETag': `"${fileId}"`,
        'Last-Modified': stats.mtime.toUTCString(),
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS'
      }
    })

    return response

  } catch (error) {
    console.error('File serving error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/files/[fileId]
 * 
 * Renames a file (updates originalFileName in database)
 */
export const PATCH = withAuth(async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const databaseId = pathSegments[pathSegments.length - 1]
  
  // Validate database ID format
  if (!databaseId || databaseId === '[fileId]') {
    return NextResponse.json(
      { error: 'Invalid database ID' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { originalFileName } = body
    
    if (!originalFileName || typeof originalFileName !== 'string' || !originalFileName.trim()) {
      return NextResponse.json(
        { error: 'Valid filename is required' },
        { status: 400 }
      )
    }

    const { db } = await import('@/db')
    const { sourceImages, generations } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')
    
    // Find the file record by exact database ID match - check source images first
    const fileRecords = await db.select().from(sourceImages)
      .where(and(
        eq(sourceImages.userId, user.id),
        eq(sourceImages.id, databaseId)
      ))
      .limit(1)
    
    if (fileRecords.length === 0) {
      // Check generations table (backwards compatibility)
      const genRecords = await db.select({
        id: generations.id,
        userId: sourceImages.userId,
        originalFileName: sourceImages.originalFileName
      }).from(generations)
        .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
        .where(and(
          eq(sourceImages.userId, user.id),
          eq(generations.id, databaseId)
        ))
        .limit(1)
      
      if (genRecords.length === 0) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
    }

    const isSourceImage = fileRecords.length > 0
    
    // Update the filename in the appropriate table
    if (isSourceImage) {
      await db.update(sourceImages)
        .set({ originalFileName: originalFileName.trim() })
        .where(and(
          eq(sourceImages.userId, user.id),
          eq(sourceImages.id, databaseId)
        ))
    } else {
      // For generations, we need to update the source image filename
      const sourceImageResult = await db.select({ sourceImageId: generations.sourceImageId })
        .from(generations)
        .where(eq(generations.id, databaseId))
        .limit(1)
        
      if (sourceImageResult.length > 0 && sourceImageResult[0].sourceImageId) {
        await db.update(sourceImages)
          .set({ originalFileName: originalFileName.trim() })
          .where(eq(sourceImages.id, sourceImageResult[0].sourceImageId))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'File renamed successfully'
    })

  } catch (error) {
    console.error('File rename error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/files/[fileId]
 * 
 * Deletes a file with proper authentication and ownership verification
 */
export const DELETE = withAuth(async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const databaseId = pathSegments[pathSegments.length - 1]
  
  // Validate database ID format
  if (!databaseId || databaseId === '[fileId]') {
    return NextResponse.json(
      { error: 'Invalid database ID' },
      { status: 400 }
    )
  }

  try {
    const { db } = await import('@/db')
    const { sourceImages, generations } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')
    
    // Find the file record by exact database ID match - check source images first
    const fileRecords = await db.select().from(sourceImages)
      .where(and(
        eq(sourceImages.userId, user.id),
        eq(sourceImages.id, databaseId)
      ))
      .limit(1)
    
    const isSourceImage = fileRecords.length > 0
    type SourceImageRecord = typeof fileRecords[0]
    type GenerationRecord = { id: string; originalImagePath: string; sourceImageId: string | null }
    let foundRecord: SourceImageRecord | GenerationRecord | undefined
    
    if (isSourceImage) {
      foundRecord = fileRecords[0]
    } else {
      // Check generations table (backwards compatibility)
      const genRecords = await db.select({
        id: generations.id,
        originalImagePath: sourceImages.originalImagePath,
        sourceImageId: generations.sourceImageId
      }).from(generations)
        .innerJoin(sourceImages, eq(generations.sourceImageId, sourceImages.id))
        .where(and(
          eq(sourceImages.userId, user.id),
          eq(generations.id, databaseId)
        ))
        .limit(1)
      
      if (genRecords.length === 0) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
      
      foundRecord = genRecords[0]
    }
    
    if (!foundRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Delete from database
    if (isSourceImage) {
      // Deleting a source image also deletes all its generations (cascade)
      await db.delete(sourceImages)
        .where(and(
          eq(sourceImages.userId, user.id),
          eq(sourceImages.id, databaseId)
        ))
    } else {
      // Deleting a specific generation
      await db.delete(generations)
        .where(eq(generations.id, databaseId))
    }

    // Delete physical file - extract filename from originalImagePath
    const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
    const pathParts = foundRecord.originalImagePath.split('/')
    const physicalFilename = pathParts[pathParts.length - 1] // Get actual filename
    const userDir = join(uploadPath, user.id)
    const filePath = join(userDir, physicalFilename)
    
    try {
      await fs.access(filePath)
      await fs.unlink(filePath)
    } catch (error) {
      console.warn('Could not delete physical file:', filePath, error)
      // Don't fail the request if physical file deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * Get MIME type from file extension
 */
function getMimeTypeFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}