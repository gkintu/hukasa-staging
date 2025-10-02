import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations, sourceImages } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getGenerationStorageService } from '@/lib/generation-storage'
import { SupportedFileType } from '@/lib/file-service/types'
import { replicate } from '@ai-sdk/replicate'
import { experimental_generateImage as generateImage } from 'ai'
import { buildStagingPrompt } from '@/lib/ai-prompt-builder'
import { convertRoomTypeToEnum, convertStyleToEnum } from '@/components/image-generation/types'
import { signUrl } from '@/lib/signed-urls'
import { valkey, CacheKeys } from '@/lib/cache/valkey-service'

// Get base URL for external API access (ngrok URL in dev, production domain in prod)
// const getBaseUrl = () => {
//   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
//   if (!baseUrl) {
//     throw new Error('NEXT_PUBLIC_BASE_URL environment variable is required')
//   }
//   return baseUrl
// };

// Helper function to simulate image buffer creation (for mock mode)
async function createMockImageBuffer(): Promise<Buffer> {
  // Simple 1x1 PNG in base64 - used for mock/development mode
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  return Buffer.from(pngBase64, 'base64')
}


// Helper function to generate image using Replicate AI (real mode)
async function generateStageImage(prompt: string, sourceImagePath: string, userId: string): Promise<Buffer> {
  try {
    console.log('🎨 Generating image with Replicate AI using prompt:', prompt)
    
    // Convert relative path to signed URL for Replicate API
    // sourceImagePath is like: "abc123def456ghi789jkl012/uuid-1234-5678-9abc-def012345678/source.webp"
    // Extract fileId from the database record (we'll use a different approach)
    const fileName = sourceImagePath.split('/').pop()?.split('.')[0]; // "abc123XYZ456"
    if (!fileName) {
      throw new Error(`Invalid source image path: ${sourceImagePath}`)
    }
    // For AI generation, we need a publicly accessible URL
    // Since this is inside the generation function, we need to get userId from the context
    // This will be fixed when sourceImage is available in the scope
    const expiresAt = Date.now() + (1 * 60 * 60 * 1000) // 1 hour
    const publicImageUrl = signUrl(sourceImagePath, userId, expiresAt);
    console.log('📸 Signed URL for Replicate:', publicImageUrl)
    
    const { image } = await generateImage({
      model: replicate.image('prunaai/flux-kontext-dev:2f311ad6069d6cb2ec28d46bb0d1da5148a983b56f4f2643d2d775d39d11e44b'),
      prompt,
      providerOptions: {
        replicate: {
          // Optimized settings for interior staging using flux-kontext-dev schema
          guidance: 3.5,
          num_inference_steps: 30, // Default for flux-kontext-dev
          seed: -1, // Random seed for variety between generations
          aspect_ratio: 'match_input_image',
          output_format: 'webp', // Keep webp format
          output_quality: 80,
          image_size: 1024, // Base image size parameter
          speed_mode: 'Juiced 🔥 (default)', // Full speed mode name for flux-kontext-dev
          img_cond_path: publicImageUrl // Enable image-to-image mode with public URL
        }
      }
    })
    
    console.log('✅ Replicate AI generation successful')
    return Buffer.from(image.uint8Array)
  } catch (error) {
    console.error('❌ Replicate AI generation failed:', error)
    throw new Error(`AI image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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

    // Cache-first pattern for image generations (same as /api/images)
    const cachedGenerations = await valkey.getOrSet(
      CacheKeys.imageVariants(imageId),
      async () => {
        // First verify the user owns this source image
        const sourceImageCheck = await db
          .select({ userId: sourceImages.userId })
          .from(sourceImages)
          .where(eq(sourceImages.id, imageId))
          .limit(1)

        if (sourceImageCheck.length === 0) {
          return null // Image not found
        }

        // Fetch all generations for this source image, ordered by creation date
        const imageGenerations = await db
          .select()
          .from(generations)
          .where(eq(generations.sourceImageId, imageId))
          .orderBy(desc(generations.createdAt))

        return {
          ownerId: sourceImageCheck[0].userId,
          generations: imageGenerations
        }
      }
    )

    if (!cachedGenerations) {
      return NextResponse.json({ success: false, message: 'Image not found' }, { status: 404 })
    }

    // Verify user owns this image
    if (cachedGenerations.ownerId !== userId) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    // Generate signed URLs for generation images (1-hour expiry)
    // URLs are generated fresh on every request, not cached
    const expiresAt = Date.now() + (60 * 60 * 1000) // 1 hour
    const signedGenerations = cachedGenerations.generations.map(generation => ({
      ...generation,
      signedUrl: generation.stagedImagePath
        ? signUrl(generation.stagedImagePath, userId, expiresAt)
        : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        generations: signedGenerations
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
    const { roomType, stagingStyle, mockGenerations, imageCount } = body

    // Validate required fields
    if (!roomType) {
      return NextResponse.json(
        { success: false, message: 'Room type is required' },
        { status: 400 }
      )
    }
    
    if (!stagingStyle) {
      return NextResponse.json(
        { success: false, message: 'Furniture style is required' },
        { status: 400 }
      )
    }

    // Check if we're in mock mode or real API mode
    const isMockMode = process.env.NEXT_PUBLIC_MOCK_API === 'true'
    
    // Determine how many images to generate
    let generationCount: number
    if (isMockMode) {
      if (!mockGenerations || !Array.isArray(mockGenerations)) {
        return NextResponse.json(
          { success: false, message: 'Mock generation data is required in mock mode' },
          { status: 400 }
        )
      }
      generationCount = mockGenerations.length
    } else {
      // Real API mode - use imageCount or fallback to mockGenerations.length if provided
      generationCount = imageCount || (mockGenerations ? mockGenerations.length : 1)
    }

    if (generationCount <= 0 || generationCount > 4) {
      return NextResponse.json(
        { success: false, message: 'Generation count must be between 1 and 4' },
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

    // Extract storage directory ID from originalImagePath for hierarchical storage
    // Path format: "userId/storageId/source.ext"
    const pathParts = sourceImage.originalImagePath.split('/')
    const storageImageId = pathParts.length >= 2 ? pathParts[1] : imageId
    console.log(`📁 Using storage directory: ${storageImageId} (from path: ${sourceImage.originalImagePath})`)

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
    
    // Log the generation mode for debugging
    console.log(`🔧 Generation mode: ${isMockMode ? 'MOCK' : 'REAL'} | Count: ${generationCount}`)
    
    // Build AI prompt for real mode using proper prompt builder
    const aiPrompt = isMockMode ? null : buildStagingPrompt({ 
      roomType, 
      interiorStyle: stagingStyle 
    })
    if (!isMockMode) {
      console.log('🎨 AI Prompt:', aiPrompt)
    }

    // Create new generations using the storage service
    const insertedGenerations = []
    
    for (let index = 0; index < generationCount; index++) {
      const variationIndex = startingVariationIndex + index
      
      console.log(`⚡ Generating variant ${variationIndex} (${index + 1}/${generationCount})...`)
      
      try {
        // Generate image based on mode
        let imageBuffer: Buffer
        let mimeType: SupportedFileType
        let jobId: string
        const startTime = Date.now() // Track timing for both modes
        
        if (isMockMode) {
          // Mock mode - simulate AI processing delay (5 seconds)
          await new Promise(resolve => setTimeout(resolve, 5000))
          imageBuffer = await createMockImageBuffer()
          mimeType = SupportedFileType.PNG
          jobId = `mock-job-${Date.now()}-${index}`
          console.log(`📝 Mock generation ${variationIndex} created`)
        } else {
          // Real AI mode - generate with Replicate using source image
          imageBuffer = await generateStageImage(aiPrompt!, sourceImage.originalImagePath, sourceImage.userId)
          mimeType = SupportedFileType.WEBP // flux-kontext-dev returns WEBP
          jobId = `replicate-job-${Date.now()}-${index}`
          console.log(`🚀 Real AI generation ${variationIndex} completed in ${Date.now() - startTime}ms`)
        }
        
        // Store the generation using hierarchical storage
        const storageResult = await generationStorageService.storeGeneration({
          userId: sourceImage.userId,
          sourceImageId: storageImageId,
          projectId: sourceImage.projectId,
          roomType: convertRoomTypeToEnum(roomType),
          stagingStyle: convertStyleToEnum(stagingStyle),
          operationType: 'stage_empty',
          variationIndex: variationIndex,
          imageBuffer: imageBuffer,
          mimeType: mimeType,
          jobId: jobId
        })
        
        // Calculate processing time (actual for real mode, mock for mock mode)
        const processingTime = isMockMode ? 2000 : (Date.now() - startTime)
        
        insertedGenerations.push({
          id: storageResult.generationId,
          sourceImageId: imageId,
          userId: sourceImage.userId,
          projectId: sourceImage.projectId,
          stagedImagePath: storageResult.stagedImagePath,
          variationIndex: storageResult.variationIndex,
          roomType: convertRoomTypeToEnum(roomType),
          stagingStyle: convertStyleToEnum(stagingStyle),
          operationType: 'stage_empty',
          status: 'completed',
          processingTimeMs: processingTime,
          createdAt: new Date(),
          completedAt: new Date()
        })
        
        console.log(`✅ Variant ${variationIndex} stored successfully${!isMockMode ? ` (${processingTime}ms)` : ''}`)
        
      } catch (error) {
        console.error(`❌ Failed to generate variant ${variationIndex}:`, error)
        
        // For real AI failures, add more specific error details
        if (!isMockMode && error instanceof Error) {
          console.error('🔴 Replicate AI Error Details:', {
            message: error.message,
            variationIndex,
            roomType,
            stagingStyle,
            promptLength: aiPrompt?.length
          })
        }
        
        // Continue with other generations even if one fails
      }
    }

    // Invalidate cache after generating new variants
    try {
      const projectId = sourceImageResult[0].projectId
      await Promise.all([
        valkey.del(CacheKeys.userImagesMetadata(userId)),
        valkey.del(CacheKeys.userProjects(userId)), // stagedVersionCount changed
        valkey.del(CacheKeys.userProject(userId, projectId)), // Project detail changed (new variants)
        valkey.del(CacheKeys.imageVariants(imageId)) // Image variants cache changed
      ])
      console.log('🗑️ Cache invalidated after generation')
    } catch (cacheError) {
      console.warn('⚠️ Failed to invalidate cache after generation:', cacheError)
      // Don't fail the request if cache invalidation fails
    }

    // Generate signed URLs for newly created generations (1-hour expiry)
    const expiresAt = Date.now() + (60 * 60 * 1000) // 1 hour
    const signedGenerations = insertedGenerations.map(generation => ({
      ...generation,
      signedUrl: generation.stagedImagePath
        ? signUrl(generation.stagedImagePath, userId, expiresAt)
        : null
    }))

    return NextResponse.json({
      success: true,
      data: {
        generations: signedGenerations
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