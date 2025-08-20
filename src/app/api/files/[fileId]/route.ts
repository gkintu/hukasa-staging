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
  const fileId = pathSegments[pathSegments.length - 1]
  
  // Validate fileId format
  if (!fileId || fileId === '[fileId]') {
    return NextResponse.json(
      { error: 'Invalid file ID' },
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
    const { generations } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')
    
    // Find the file record in the database
    const extensions = ['.jpg', '.jpeg', '.png', '.webp']
    let foundRecord = null
    
    for (const ext of extensions) {
      const records = await db.select().from(generations)
        .where(and(
          eq(generations.userId, user.id),
          eq(generations.originalImagePath, `uploads/${user.id}/${fileId}${ext}`)
        ))
        .limit(1)
      
      if (records.length > 0) {
        foundRecord = records[0]
        break
      }
    }
    
    if (!foundRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Update the filename in database
    await db.update(generations)
      .set({ originalFileName: originalFileName.trim() })
      .where(and(
        eq(generations.userId, user.id),
        eq(generations.id, foundRecord.id)
      ))

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
  const fileId = pathSegments[pathSegments.length - 1]
  
  // Validate fileId format
  if (!fileId || fileId === '[fileId]') {
    return NextResponse.json(
      { error: 'Invalid file ID' },
      { status: 400 }
    )
  }

  try {
    const { db } = await import('@/db')
    const { generations } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')
    
    // Find the file record in the database
    const fileRecord = await db.select().from(generations)
      .where(and(
        eq(generations.userId, user.id),
        eq(generations.originalImagePath, `uploads/${user.id}/${fileId}.png`)
      ))
      .limit(1)
    
    if (fileRecord.length === 0) {
      // Try with different extensions
      const extensions = ['.jpg', '.jpeg', '.png', '.webp']
      let foundRecord = null
      
      for (const ext of extensions) {
        const records = await db.select().from(generations)
          .where(and(
            eq(generations.userId, user.id),
            eq(generations.originalImagePath, `uploads/${user.id}/${fileId}${ext}`)
          ))
          .limit(1)
        
        if (records.length > 0) {
          foundRecord = records[0]
          break
        }
      }
      
      if (!foundRecord) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
      
      // Delete from database
      await db.delete(generations)
        .where(and(
          eq(generations.userId, user.id),
          eq(generations.id, foundRecord.id)
        ))
    } else {
      // Delete from database
      await db.delete(generations)
        .where(and(
          eq(generations.userId, user.id),
          eq(generations.id, fileRecord[0].id)
        ))
    }

    // Delete physical file
    const uploadPath = process.env.FILE_UPLOAD_PATH || './uploads'
    const userDir = join(uploadPath, user.id)
    
    const extensions = ['.jpg', '.jpeg', '.png', '.webp']
    let fileDeleted = false
    
    for (const ext of extensions) {
      const filePath = join(userDir, `${fileId}${ext}`)
      try {
        await fs.access(filePath)
        await fs.unlink(filePath)
        fileDeleted = true
        break
      } catch {
        // File doesn't exist with this extension, try next
      }
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