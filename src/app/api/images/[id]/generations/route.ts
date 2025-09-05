import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations, sourceImages } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getGenerationStorageService } from '@/lib/generation-storage'
import { SupportedFileType } from '@/lib/file-service/types'

// Helper function to simulate image buffer creation (replace with real AI generation)
async function createMockImageBuffer(): Promise<Buffer> {
  // Simple 1x1 PNG in base64 - replace this with actual AI generation service
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  return Buffer.from(pngBase64, 'base64')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // First verify the user owns this source image
    const sourceImageCheck = await db
      .select({ userId: sourceImages.userId })
      .from(sourceImages)
      .where(eq(sourceImages.id, imageId))
      .limit(1)

    if (sourceImageCheck.length === 0) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    if (sourceImageCheck[0].userId !== userId) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    // Fetch all generations for this source image, ordered by creation date
    const imageGenerations = await db
      .select()
      .from(generations)
      .where(eq(generations.sourceImageId, imageId))
      .orderBy(desc(generations.createdAt))

    return NextResponse.json({
      success: true,
      data: {
        generations: imageGenerations
      }
    })
  } catch (error) {
    console.error('Error fetching generations:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    const body = await request.json()
    const { roomType, stagingStyle, mockGenerations } = body

    // Validate required fields
    if (!roomType || !stagingStyle || !mockGenerations) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // First, get the source image to get userId and projectId, and verify ownership
    const sourceImageResult = await db
      .select()
      .from(sourceImages)
      .where(eq(sourceImages.id, imageId))
      .limit(1)

    if (sourceImageResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Source image not found' },
        { status: 404 }
      )
    }

    const sourceImage = sourceImageResult[0]
    
    if (sourceImage.userId !== userId) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    // Get the current highest variation index for this source image
    const maxVariationResult = await db
      .select({ maxVariation: generations.variationIndex })
      .from(generations)
      .where(eq(generations.sourceImageId, imageId))
      .orderBy(desc(generations.variationIndex))
      .limit(1)

    const startingVariationIndex = maxVariationResult.length > 0 
      ? maxVariationResult[0].maxVariation + 1 
      : 1

    // Get the generation storage service
    const generationStorageService = await getGenerationStorageService()
    
    // Create new generations using the storage service
    const insertedGenerations = []
    
    for (let index = 0; index < mockGenerations.length; index++) {
      const variationIndex = startingVariationIndex + index
      
      // Create mock image data (replace with real AI generation)
      const imageBuffer = await createMockImageBuffer()
      
      try {
        // Store the generation using hierarchical storage
        const storageResult = await generationStorageService.storeGeneration({
          userId: sourceImage.userId,
          sourceImageId: imageId,
          projectId: sourceImage.projectId,
          roomType: roomType.toLowerCase().replace(/\s+/g, '_'),
          stagingStyle: stagingStyle.toLowerCase(),
          operationType: 'stage_empty',
          variationIndex: variationIndex,
          imageBuffer: imageBuffer,
          mimeType: SupportedFileType.PNG,
          jobId: `mock-job-${Date.now()}-${index}`
        })
        
        insertedGenerations.push({
          id: storageResult.generationId,
          sourceImageId: imageId,
          userId: sourceImage.userId,
          projectId: sourceImage.projectId,
          stagedImagePath: storageResult.stagedImagePath,
          variationIndex: storageResult.variationIndex,
          roomType: roomType.toLowerCase().replace(/\s+/g, '_'),
          stagingStyle: stagingStyle.toLowerCase(),
          operationType: 'stage_empty',
          status: 'completed',
          processingTimeMs: 2000,
          createdAt: new Date(),
          completedAt: new Date()
        })
        
      } catch (error) {
        console.error(`Failed to store generation ${variationIndex}:`, error)
        // Continue with other generations even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        generations: insertedGenerations
      }
    })
  } catch (error) {
    console.error('Error creating generations:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create generations' },
      { status: 500 }
    )
  }
}