import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages, projects } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

interface MoveImagesRequest {
  imageIds: string[]
  targetProjectId: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const body: MoveImagesRequest = await request.json()
    const { imageIds, targetProjectId } = body

    // Validate input
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ success: false, message: 'Image IDs are required' }, { status: 400 })
    }

    if (!targetProjectId || typeof targetProjectId !== 'string') {
      return NextResponse.json({ success: false, message: 'Target project ID is required' }, { status: 400 })
    }

    // Verify target project exists and belongs to user
    const targetProject = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, targetProjectId), eq(projects.userId, userId)))
      .limit(1)

    if (targetProject.length === 0) {
      return NextResponse.json({ success: false, message: 'Target project not found' }, { status: 404 })
    }

    // Verify all images belong to user and get current project info
    const imagesToMove = await db
      .select({
        id: sourceImages.id,
        originalImagePath: sourceImages.originalImagePath,
        originalFileName: sourceImages.originalFileName,
        currentProjectId: sourceImages.projectId
      })
      .from(sourceImages)
      .where(and(
        inArray(sourceImages.id, imageIds),
        eq(sourceImages.userId, userId)
      ))

    if (imagesToMove.length === 0) {
      return NextResponse.json({ success: false, message: 'No images found' }, { status: 404 })
    }

    if (imagesToMove.length !== imageIds.length) {
      return NextResponse.json({ 
        success: false, 
        message: `Only ${imagesToMove.length} of ${imageIds.length} images found` 
      }, { status: 400 })
    }

    // Check if any images are already in the target project
    const alreadyInTarget = imagesToMove.filter(img => img.currentProjectId === targetProjectId)
    if (alreadyInTarget.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: `${alreadyInTarget.length} images are already in the target project` 
      }, { status: 400 })
    }

    // Move source images to the target project (generations will stay with their source images)
    const sourceImageIds = imagesToMove.map(img => img.id)
    
    const moveResult = await db
      .update(sourceImages)
      .set({ 
        projectId: targetProjectId,
        updatedAt: new Date()
      })
      .where(and(
        inArray(sourceImages.id, sourceImageIds),
        eq(sourceImages.userId, userId)
      ))
      .returning({ id: sourceImages.id })

    // Get project names for response
    const projectNames = await db
      .select({
        id: projects.id,
        name: projects.name
      })
      .from(projects)
      .where(and(
        inArray(projects.id, [...new Set([...imagesToMove.map(img => img.currentProjectId), targetProjectId])]),
        eq(projects.userId, userId)
      ))

    const targetProjectName = projectNames.find(p => p.id === targetProjectId)?.name || 'Unknown Project'

    return NextResponse.json({
      success: true,
      message: `Successfully moved ${imagesToMove.length} ${imagesToMove.length === 1 ? 'image' : 'images'} to ${targetProjectName}`,
      movedCount: moveResult.length,
      targetProject: {
        id: targetProjectId,
        name: targetProjectName
      }
    })

  } catch (error) {
    console.error('Error moving images:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}