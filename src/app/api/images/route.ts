import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations, projects } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all generations for this user with project info, ordered by newest first
    const userGenerations = await db
      .select({
        id: generations.id,
        projectId: generations.projectId,
        projectName: projects.name,
        originalImagePath: generations.originalImagePath,
        originalFileName: generations.originalFileName,
        displayName: generations.displayName,
        fileSize: generations.fileSize,
        stagedImagePath: generations.stagedImagePath,
        variationIndex: generations.variationIndex,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        operationType: generations.operationType,
        status: generations.status,
        completedAt: generations.completedAt,
        errorMessage: generations.errorMessage,
        createdAt: generations.createdAt
      })
      .from(generations)
      .innerJoin(projects, eq(generations.projectId, projects.id))
      .where(eq(generations.userId, userId))
      .orderBy(desc(generations.createdAt), generations.originalImagePath, generations.variationIndex)

    // Group generations by source image (originalImagePath)
    const sourceImages = new Map<string, {
      id: string
      projectId: string
      projectName: string
      originalImagePath: string
      originalFileName: string
      displayName: string | null
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

    for (const gen of userGenerations) {
      const key = gen.originalImagePath
      
      if (!sourceImages.has(key)) {
        sourceImages.set(key, {
          id: gen.id,
          projectId: gen.projectId,
          projectName: gen.projectName,
          originalImagePath: gen.originalImagePath,
          originalFileName: gen.originalFileName,
          displayName: gen.displayName,
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
      sourceImages: sourceImagesArray
    })
  } catch (error) {
    console.error('Error fetching all images:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}