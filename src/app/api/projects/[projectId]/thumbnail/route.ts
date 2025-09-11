/**
 * Project Thumbnail API
 * 
 * Industry-standard approach: /api/projects/{projectId}/thumbnail
 * Returns the thumbnail image for a project (first source image)
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import { withAuth } from '@/lib/withAuth'
import { db } from '@/db'
import { sourceImages, projects } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export const GET = withAuth(async (request: NextRequest, user) => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const projectId = pathSegments[pathSegments.length - 2] // [projectId]/thumbnail
  
  if (!projectId) {
    return NextResponse.json(
      { error: 'Invalid project ID' },
      { status: 400 }
    )
  }

  try {
    // Verify project exists and user has access
    const projectRecord = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (projectRecord.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = projectRecord[0]
    
    // Check if user owns this project
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get the first source image from this project as thumbnail
    const thumbnailImage = await db.select()
      .from(sourceImages)
      .where(eq(sourceImages.projectId, projectId))
      .orderBy(asc(sourceImages.createdAt))
      .limit(1)

    if (thumbnailImage.length === 0) {
      // No images in project - return placeholder or 404
      return NextResponse.json(
        { error: 'No images found in project' },
        { status: 404 }
      )
    }

    const sourceImage = thumbnailImage[0]

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
      const testPath = `${uploadPath}/${sourceImage.userId}/${sourceImage.id}/source${ext}`
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
        { error: 'Thumbnail file not found on disk' },
        { status: 404 }
      )
    }

    // Read and serve the file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)

    // Determine MIME type
    const mimeType = getMimeTypeFromExtension(actualExtension)

    // Set response headers optimized for thumbnails
    const headers = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, max-age=86400', // Cache for 24 hours
      'ETag': `"${project.id}-${sourceImage.id}"`,
      'Last-Modified': stats.mtime.toUTCString(),
    }

    return new NextResponse(new Uint8Array(fileBuffer), { headers })
    
  } catch (error) {
    console.error('Project thumbnail serving error:', error)
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