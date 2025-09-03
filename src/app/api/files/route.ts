import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { db } from '@/db'
import { sourceImages, generations } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    
    // Get user's source images with their generations
    const userFiles = await db
      .select({
        // Source image data
        id: sourceImages.id,
        userId: sourceImages.userId,
        projectId: sourceImages.projectId,
        originalImagePath: sourceImages.originalImagePath,
        originalFileName: sourceImages.originalFileName,
        displayName: sourceImages.displayName,
        fileSize: sourceImages.fileSize,
        isFavorited: sourceImages.isFavorited,
        createdAt: sourceImages.createdAt,
        updatedAt: sourceImages.updatedAt,
        // Generation data (for backwards compatibility)
        generationId: generations.id,
        stagedImagePath: generations.stagedImagePath,
        variationIndex: generations.variationIndex,
        roomType: generations.roomType,
        stagingStyle: generations.stagingStyle,
        operationType: generations.operationType,
        status: generations.status,
        processingTimeMs: generations.processingTimeMs,
        errorMessage: generations.errorMessage,
        completedAt: generations.completedAt
      })
      .from(sourceImages)
      .leftJoin(generations, eq(sourceImages.id, generations.sourceImageId))
      .where(eq(sourceImages.userId, userId))

    return NextResponse.json({ success: true, files: userFiles })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
