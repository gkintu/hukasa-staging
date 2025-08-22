import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { projects, generations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

    // Get all generations for this project, grouped by source image
    const projectGenerations = await db
      .select()
      .from(generations)
      .where(and(eq(generations.projectId, projectId), eq(generations.userId, userId)))
      .orderBy(generations.originalImagePath, generations.variationIndex)

    // Group generations by source image
    const sourceImages = new Map<string, {
      id: string
      originalImagePath: string
      originalFileName: string
      fileSize: number | null
      roomType: string
      stagingStyle: string
      operationType: string
      createdAt: Date
      variants: Array<{
        id: string
        stagedImagePath: string | null
        variationIndex: number
        status: string
        completedAt: Date | null
        errorMessage: string | null
      }>
    }>()

    for (const gen of projectGenerations) {
      const key = gen.originalImagePath
      
      if (!sourceImages.has(key)) {
        sourceImages.set(key, {
          id: gen.id,
          originalImagePath: gen.originalImagePath,
          originalFileName: gen.originalFileName,
          fileSize: gen.fileSize,
          roomType: gen.roomType,
          stagingStyle: gen.stagingStyle,
          operationType: gen.operationType,
          createdAt: gen.createdAt,
          variants: []
        })
      }

      sourceImages.get(key)!.variants.push({
        id: gen.id,
        stagedImagePath: gen.stagedImagePath,
        variationIndex: gen.variationIndex,
        status: gen.status,
        completedAt: gen.completedAt,
        errorMessage: gen.errorMessage
      })
    }

    const sourceImagesArray = Array.from(sourceImages.values())

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

    // Delete all generations first (cascade delete)
    await db
      .delete(generations)
      .where(and(eq(generations.projectId, projectId), eq(generations.userId, userId)))

    // Delete the project
    const deletedProject = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .returning()

    if (deletedProject.length === 0) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}