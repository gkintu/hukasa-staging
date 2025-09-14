import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages, projects, generations } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all source images for this user with project info and their generations
    const userSourceImages = await db
      .select({
        // Source image fields
        id: sourceImages.id,
        projectId: sourceImages.projectId,
        projectName: projects.name,
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
        completedAt: generations.completedAt,
        errorMessage: generations.errorMessage,
        jobId: generations.jobId,
        processingTimeMs: generations.processingTimeMs
      })
      .from(sourceImages)
      .innerJoin(projects, eq(sourceImages.projectId, projects.id))
      .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
      .where(eq(sourceImages.userId, userId))
      .orderBy(desc(sourceImages.createdAt), generations.variationIndex)

    // Group source images with their generations
    const sourceImagesMap = new Map<string, {
      id: string
      projectId: string
      projectName: string
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
        completedAt: Date | null
        errorMessage: string | null
        jobId: string | null
        processingTimeMs: number | null
      }>
    }>()

    for (const row of userSourceImages) {
      const sourceImageId = row.id
      
      if (!sourceImagesMap.has(sourceImageId)) {
        sourceImagesMap.set(sourceImageId, {
          id: row.id,
          projectId: row.projectId,
          projectName: row.projectName,
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
          variationIndex: row.variationIndex || 1, // Default to 1 as per database default
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
      sourceImages: sourceImagesArray
    })
  } catch (error) {
    console.error('Error fetching all images:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}