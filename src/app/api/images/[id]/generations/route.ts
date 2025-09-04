import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { generations, sourceImages } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

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

    // Create new generations (additive)
    const newGenerations = mockGenerations.map((mockGen: { url: string }, index: number) => ({
      sourceImageId: imageId,
      userId: sourceImage.userId,
      projectId: sourceImage.projectId,
      stagedImagePath: mockGen.url,
      variationIndex: startingVariationIndex + index,
      roomType: roomType.toLowerCase().replace(/\s+/g, '_'),
      stagingStyle: stagingStyle.toLowerCase(),
      operationType: 'stage_empty' as const,
      status: 'completed' as const,
      processingTimeMs: 2000,
      completedAt: new Date()
    }))

    const insertedGenerations = await db
      .insert(generations)
      .values(newGenerations)
      .returning()

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