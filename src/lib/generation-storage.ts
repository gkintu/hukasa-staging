/**
 * Generation Storage Utilities
 * 
 * High-level utilities for storing and managing AI-generated images
 * with proper database integration and hierarchical file organization.
 */

import { db } from '@/db'
import { generations, sourceImages } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { EnhancedLocalFileService, StoreGenerationRequest } from './file-service/enhanced-local-service'
import { FileServiceConfig, FileStorageProvider, SupportedFileType, createUserId } from './file-service/types'
import { createSourceImageId, createGenerationId } from './file-service/storage-paths'

/**
 * Generation creation request
 */
export interface CreateGenerationRequest {
  userId: string
  sourceImageId: string
  projectId: string
  roomType: string
  stagingStyle: string
  operationType: string
  variationIndex: number
  imageBuffer: Buffer
  mimeType: SupportedFileType
  jobId?: string
}

/**
 * Generation storage result
 */
export interface GenerationStorageResult {
  generationId: string
  stagedImagePath: string
  publicUrl: string
  variationIndex: number
}

/**
 * Generation storage service
 */
export class GenerationStorageService {
  private fileService: EnhancedLocalFileService

  constructor() {
    // Initialize file service with configuration
    const config: FileServiceConfig = {
      provider: FileStorageProvider.LOCAL,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        SupportedFileType.JPEG,
        SupportedFileType.PNG,
        SupportedFileType.WEBP,
        SupportedFileType.HEIC,
        SupportedFileType.TIFF,
        SupportedFileType.BMP
      ],
      storageConfig: {
        type: 'local',
        uploadPath: process.env.FILE_UPLOAD_PATH || './uploads',
        publicPath: process.env.FILE_PUBLIC_PATH || '/uploads',
        createDirectories: true
      },
      imageProcessing: {
        quality: {
          jpeg: 85,
          webp: 80,
          png: 6
        },
        maxDimensions: {
          width: 2048,
          height: 2048
        },
        enableOptimization: true,
        preserveMetadata: false
      }
    }

    this.fileService = new EnhancedLocalFileService(config)
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.fileService.initialize()
  }

  /**
   * Store a new generation with database record
   */
  async storeGeneration(request: CreateGenerationRequest): Promise<GenerationStorageResult> {
    const userId = createUserId(request.userId)
    const sourceImageId = createSourceImageId(request.sourceImageId)

    // Verify source image exists
    const sourceImage = await db.select()
      .from(sourceImages)
      .where(
        and(
          eq(sourceImages.id, request.sourceImageId),
          eq(sourceImages.userId, request.userId)
        )
      )
      .limit(1)

    if (sourceImage.length === 0) {
      throw new Error(`Source image not found: ${request.sourceImageId}`)
    }

    try {
      // Store file using hierarchical storage
      const storageRequest: StoreGenerationRequest = {
        sourceImageId,
        userId,
        variationIndex: request.variationIndex,
        imageBuffer: request.imageBuffer,
        mimeType: request.mimeType
      }

      const storageResult = await this.fileService.storeGeneration(storageRequest)

      if (!storageResult || !('success' in storageResult) || !storageResult.success) {
        throw new Error('Failed to store generation file')
      }

      // Create database record
      const generationRecord = await db.insert(generations).values({
        id: storageResult.generationId,
        sourceImageId: request.sourceImageId,
        userId: request.userId,
        projectId: request.projectId,
        stagedImagePath: storageResult.relativePath,
        variationIndex: request.variationIndex,
        roomType: request.roomType,
        stagingStyle: request.stagingStyle,
        operationType: request.operationType,
        status: 'completed',
        jobId: request.jobId,
        createdAt: new Date(),
        completedAt: new Date()
      }).returning()

      return {
        generationId: storageResult.generationId,
        stagedImagePath: storageResult.relativePath,
        publicUrl: storageResult.publicUrl,
        variationIndex: storageResult.variationIndex
      }

    } catch (error) {
      console.error('Generation storage failed:', error)
      throw new Error(`Failed to store generation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a generation (file and database record)
   */
  async deleteGeneration(generationId: string, userId: string): Promise<void> {
    // Get generation record
    const generation = await db.select()
      .from(generations)
      .where(
        and(
          eq(generations.id, generationId),
          eq(generations.userId, userId)
        )
      )
      .limit(1)

    if (generation.length === 0) {
      throw new Error(`Generation not found: ${generationId}`)
    }

    const gen = generation[0]

    try {
      // Delete database record first
      await db.delete(generations)
        .where(eq(generations.id, generationId))

      // TODO: Delete file using enhanced file service
      // This requires implementing deleteGeneration method with proper path parsing
      console.log(`Generation deleted from database: ${generationId}`)
      console.log(`TODO: Delete file: ${gen.stagedImagePath}`)

    } catch (error) {
      console.error('Generation deletion failed:', error)
      throw new Error(`Failed to delete generation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all generations for a source image
   */
  async getGenerationsForSource(sourceImageId: string, userId: string): Promise<typeof generations.$inferSelect[]> {
    return await db.select()
      .from(generations)
      .where(
        and(
          eq(generations.sourceImageId, sourceImageId),
          eq(generations.userId, userId)
        )
      )
      .orderBy(generations.variationIndex)
  }

  /**
   * Update generation status
   */
  async updateGenerationStatus(
    generationId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date()
    }

    if (status === 'completed') {
      updateData.completedAt = new Date()
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage
    }

    await db.update(generations)
      .set(updateData)
      .where(eq(generations.id, generationId))
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats(userId: string): Promise<{
    total: number
    completed: number
    failed: number
    processing: number
  }> {
    const results = await db.select({
      status: generations.status
    })
    .from(generations)
    .where(eq(generations.userId, userId))

    const stats = {
      total: results.length,
      completed: 0,
      failed: 0,
      processing: 0
    }

    results.forEach(result => {
      switch (result.status) {
        case 'completed':
          stats.completed++
          break
        case 'failed':
          stats.failed++
          break
        case 'processing':
        case 'pending':
          stats.processing++
          break
      }
    })

    return stats
  }
}

/**
 * Default generation storage service instance
 */
let _generationStorageService: GenerationStorageService | null = null

export async function getGenerationStorageService(): Promise<GenerationStorageService> {
  if (!_generationStorageService) {
    _generationStorageService = new GenerationStorageService()
    await _generationStorageService.initialize()
  }
  return _generationStorageService
}

/**
 * Convenience function to store a generation
 */
export async function storeGeneration(request: CreateGenerationRequest): Promise<GenerationStorageResult> {
  const service = await getGenerationStorageService()
  return await service.storeGeneration(request)
}

/**
 * Convenience function to delete a generation
 */
export async function deleteGeneration(generationId: string, userId: string): Promise<void> {
  const service = await getGenerationStorageService()
  return await service.deleteGeneration(generationId, userId)
}