import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { projects, sourceImages, generations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const userId = session.user.id

    // Verify project belongs to user
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Get all source images for this project with their generations
    const projectSourceImages = await db
      .select({
        // Source image fields
        id: sourceImages.id,
        originalImagePath: sourceImages.originalImagePath,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        fileSize: sourceImages.fileSize,
        isFavorited: sourceImages.isFavorited,
        createdAt: sourceImages.createdAt,
        updatedAt: sourceImages.updatedAt,
        // Generation fields (will be null if no generations exist)
        generationId: generations.id,
        stagedImagePath: generations.stagedImagePath,
        variationIndex: generations.variationIndex,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        operationType: generations.operationType,
        status: generations.status,
        jobId: generations.jobId,
        errorMessage: generations.errorMessage,
        processingTimeMs: generations.processingTimeMs,
        completedAt: generations.completedAt
      })
      .from(sourceImages)
      .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
      .where(and(eq(sourceImages.projectId, projectId), eq(sourceImages.userId, userId)))
      .orderBy(sourceImages.createdAt, generations.variationIndex)

    // Group source images with their generations
    const sourceImagesMap = new Map<string, {
      id: string
      originalImagePath: string
      originalFileName: string
      displayName: string | null
      fileSize: number | null
      isFavorited: boolean
      createdAt: Date
      updatedAt: Date
      variants: Array<{
        id: string
        stagedImagePath: string | null
        variationIndex: number
        roomType: string
        stagingStyle: string
        operationType: string
        status: string
        jobId: string | null
        errorMessage: string | null
        processingTimeMs: number | null
        completedAt: Date | null
      }>
    }>()

    for (const row of projectSourceImages) {
      const sourceImageId = row.id
      
      if (!sourceImagesMap.has(sourceImageId)) {
        sourceImagesMap.set(sourceImageId, {
          id: row.id,
          originalImagePath: row.originalImagePath,
          originalFileName: row.originalFileName,
          displayName: row.displayName,
          fileSize: row.fileSize,
          isFavorited: row.isFavorited,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          variants: []
        })
      }

      // Add generation variant if it exists (all generation fields will be non-null when generationId exists)
      if (row.generationId && row.roomType && row.stagingStyle && row.operationType && row.status) {
        sourceImagesMap.get(sourceImageId)!.variants.push({
          id: row.generationId,
          stagedImagePath: row.stagedImagePath,
          variationIndex: row.variationIndex || 1,
          roomType: row.roomType,
          stagingStyle: row.stagingStyle,
          operationType: row.operationType,
          status: row.status,
          jobId: row.jobId,
          errorMessage: row.errorMessage,
          processingTimeMs: row.processingTimeMs,
          completedAt: row.completedAt
        })
      }
    }

    const sourceImagesArray = Array.from(sourceImagesMap.values())

    return NextResponse.json({ 
      success: true, 
      project: project[0],
      sourceImages: sourceImagesArray
    })
  } catch (error) {
    console.error('Error fetching project details:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const userId = session.user.id
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Project name is required' }, { status: 400 })
    }

    // Update project name
    const updatedProject = await db
      .update(projects)
      .set({
        name: name.trim(),
        updatedAt: new Date()
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning()

    if (updatedProject.length === 0) {
      return NextResponse.json({ success: false, message: 'Project not found or update failed' }, { status: 404 })
    }

    // Invalidate projects cache (project renamed)
    await valkey.del(CacheKeys.userProjects(userId))

    return NextResponse.json({
      success: true,
      project: updatedProject[0],
      message: 'Project updated successfully'
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const userId = session.user.id

    // Delete all source images first (this will cascade delete generations due to FK constraint)
    await db
      .delete(sourceImages)
      .where(and(eq(sourceImages.projectId, projectId), eq(sourceImages.userId, userId)))

    // Delete the project
    const deletedProject = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning()

    if (deletedProject.length === 0) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Invalidate projects cache (project deleted)
    await valkey.del(CacheKeys.userProjects(userId))

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}