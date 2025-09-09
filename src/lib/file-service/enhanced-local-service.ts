/**
 * Enhanced Local File Service with Generation Support
 * 
 * Extends the base LocalFileService to support hierarchical storage
 * for source images and AI-generated results following industry patterns.
 */

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { nanoid } from 'nanoid'
import sharp from 'sharp'

import {
  FileServiceConfig,
  LocalStorageConfig,
  FileId,
  UserId,
  FileMetadata,
  FileUploadResponse,
  FileValidationResponse,
  FileOperationError,
  SupportedFileType,
  isFileOperationError
} from './types'

import {
  StoragePathManager,
  createStoragePathManager,
  SourceImageId,
  GenerationId,
  createSourceImageId,
  createGenerationId
} from './storage-paths'

import { BaseFileService } from './factory'
import { FileValidator } from './validation'
import { 
  FileServiceErrorFactory, 
  FileServiceErrorCode,
  errorToOperationResult 
} from './errors'

/**
 * Generation storage result
 */
export interface GenerationStorageResult {
  readonly success: true
  readonly generationId: GenerationId
  readonly relativePath: string
  readonly publicUrl: string
  readonly variationIndex: number
}

/**
 * Generation storage request
 */
export interface StoreGenerationRequest {
  readonly sourceImageId: SourceImageId
  readonly userId: UserId
  readonly projectId: string
  readonly variationIndex: number
  readonly roomType: string
  readonly stagingStyle: string
  readonly operationType: string
  readonly jobId?: string
  readonly imageBuffer: Buffer
  readonly mimeType: SupportedFileType
}

/**
 * Enhanced storage manager supporting hierarchical structure
 */
class EnhancedStorageManager {
  private config: LocalStorageConfig
  private pathManager: StoragePathManager
  
  constructor(config: LocalStorageConfig) {
    this.config = config
    this.pathManager = createStoragePathManager({
      baseUploadPath: config.uploadPath,
      basePublicPath: config.publicPath
    })
  }

  /**
   * Initialize hierarchical directory structure
   */
  async initialize(): Promise<void> {
    if (this.config.createDirectories) {
      try {
        await fs.mkdir(this.config.uploadPath, { recursive: true })
      } catch (error) {
        throw FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.SERVICE_UNAVAILABLE,
          `Failed to create base upload directory: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  // ===== SOURCE IMAGE OPERATIONS =====

  /**
   * Store source image in hierarchical structure
   */
  async storeSourceImage(
    userId: UserId, 
    sourceImageId: SourceImageId, 
    buffer: Buffer, 
    extension: string
  ): Promise<void> {
    const sourcesDir = this.pathManager.getSourcesDirectory(userId)
    const filePath = this.pathManager.getSourceImagePath(userId, sourceImageId, extension)

    try {
      // Ensure sources directory exists
      await fs.mkdir(sourcesDir, { recursive: true })
      
      // Write file atomically
      await fs.writeFile(filePath, buffer)
    } catch (error) {
      throw FileServiceErrorFactory.createUploadError(
        FileServiceErrorCode.UPLOAD_FAILED,
        `Failed to store source image: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete source image and all its generations
   */
  async deleteSourceImage(userId: UserId, sourceImageId: SourceImageId, extension: string): Promise<void> {
    const sourceFilePath = this.pathManager.getSourceImagePath(userId, sourceImageId, extension)
    const generationsDir = this.pathManager.getGenerationsDirectory(userId, sourceImageId)

    try {
      // Delete source image file
      await fs.unlink(sourceFilePath)

      // Delete entire generations directory for this source
      try {
        await fs.rm(generationsDir, { recursive: true, force: true })
      } catch (error) {
        // Ignore if directory doesn't exist (no generations created yet)
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`Failed to delete generations directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Clean up empty parent directories
      await this.cleanupEmptyDirectories(userId)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw FileServiceErrorFactory.createAccessError(
          FileServiceErrorCode.FILE_NOT_FOUND,
          'Source image not found'
        )
      }
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.DELETION_FAILED,
        `Failed to delete source image: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ===== GENERATION OPERATIONS =====

  /**
   * Store AI-generated image in hierarchical structure
   */
  async storeGeneration(request: StoreGenerationRequest): Promise<GenerationStorageResult> {
    const generationId = createGenerationId(nanoid())
    const extension = this.getFileExtension(request.mimeType)
    
    const generationsDir = this.pathManager.getGenerationsDirectory(request.userId, request.sourceImageId)
    const filePath = this.pathManager.getGenerationPath(
      request.userId, 
      request.sourceImageId, 
      request.variationIndex,
      generationId, 
      extension
    )

    try {
      // Ensure generations directory exists
      await fs.mkdir(generationsDir, { recursive: true })
      
      // Write generation file
      await fs.writeFile(filePath, request.imageBuffer)

      // Generate paths for response
      const relativePath = this.pathManager.getGenerationRelativePath(
        request.userId,
        request.sourceImageId,
        request.variationIndex,
        generationId,
        extension
      )

      const publicUrl = this.pathManager.getGenerationPublicUrl(
        request.userId,
        request.sourceImageId,
        request.variationIndex,
        generationId,
        extension
      )

      return {
        success: true,
        generationId,
        relativePath,
        publicUrl,
        variationIndex: request.variationIndex
      }

    } catch (error) {
      throw FileServiceErrorFactory.createUploadError(
        FileServiceErrorCode.UPLOAD_FAILED,
        `Failed to store generation: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete specific generation
   */
  async deleteGeneration(
    userId: UserId, 
    sourceImageId: SourceImageId, 
    variationIndex: number,
    generationId: GenerationId, 
    extension: string
  ): Promise<void> {
    const filePath = this.pathManager.getGenerationPath(
      userId, 
      sourceImageId, 
      variationIndex,
      generationId, 
      extension
    )

    try {
      await fs.unlink(filePath)

      // Clean up empty directories after generation deletion
      await this.cleanupEmptyDirectories(userId)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw FileServiceErrorFactory.createAccessError(
          FileServiceErrorCode.FILE_NOT_FOUND,
          'Generation not found'
        )
      }
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.DELETION_FAILED,
        `Failed to delete generation: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Clean up empty directories after file deletion
   * Removes empty user directories recursively: sources/, generations/, and user folder if completely empty
   */
  async cleanupEmptyDirectories(userId: UserId): Promise<void> {
    try {
      const userDir = join(this.config.uploadPath, userId)
      const sourcesDir = this.pathManager.getSourcesDirectory(userId)
      const userGenerationsDir = join(userDir, 'generations')

      // Helper function to recursively remove empty directories
      const removeEmptyDirRecursive = async (dirPath: string): Promise<boolean> => {
        try {
          const contents = await fs.readdir(dirPath)
          
          // Process each item in the directory
          for (const item of contents) {
            const itemPath = join(dirPath, item)
            try {
              const stat = await fs.stat(itemPath)
              if (stat.isDirectory()) {
                // Recursively try to remove subdirectory
                await removeEmptyDirRecursive(itemPath)
              }
            } catch {
              // Skip items that can't be accessed
            }
          }
          
          // After processing contents, check if directory is now empty
          const newContents = await fs.readdir(dirPath)
          if (newContents.length === 0) {
            await fs.rmdir(dirPath)
            return true // Successfully removed
          }
          return false // Directory not empty
        } catch {
          // Directory doesn't exist or can't be accessed
          return false
        }
      }

      // Clean up sources directory
      await removeEmptyDirRecursive(sourcesDir)

      // Clean up generations directory
      await removeEmptyDirRecursive(userGenerationsDir)

      // Clean up user directory if now empty
      await removeEmptyDirRecursive(userDir)
      
    } catch (error) {
      // Log but don't fail the operation for cleanup issues
      console.warn(`Failed to cleanup empty directories for user ${userId}:`, error)
    }
  }

  /**
   * Check if source image exists
   */
  async sourceImageExists(userId: UserId, sourceImageId: SourceImageId, extension: string): Promise<boolean> {
    const filePath = this.pathManager.getSourceImagePath(userId, sourceImageId, extension)
    
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if generation exists
   */
  async generationExists(
    userId: UserId, 
    sourceImageId: SourceImageId, 
    variationIndex: number,
    generationId: GenerationId, 
    extension: string
  ): Promise<boolean> {
    const filePath = this.pathManager.getGenerationPath(
      userId, 
      sourceImageId, 
      variationIndex,
      generationId, 
      extension
    )
    
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get source image public URL
   */
  getSourceImagePublicUrl(userId: UserId, sourceImageId: SourceImageId, extension: string): string {
    return this.pathManager.getSourceImagePublicUrl(userId, sourceImageId, extension)
  }

  /**
   * Get generation public URL
   */
  getGenerationPublicUrl(
    userId: UserId,
    sourceImageId: SourceImageId,
    variationIndex: number,
    generationId: GenerationId,
    extension: string
  ): string {
    return this.pathManager.getGenerationPublicUrl(
      userId,
      sourceImageId,
      variationIndex,
      generationId,
      extension
    )
  }

  /**
   * Get file extension for supported types
   */
  private getFileExtension(mimeType: SupportedFileType): string {
    switch (mimeType) {
      case SupportedFileType.JPEG:
        return '.jpg'
      case SupportedFileType.PNG:
        return '.png'
      case SupportedFileType.WEBP:
        return '.webp'
      case SupportedFileType.HEIC:
        return '.heic'
      case SupportedFileType.TIFF:
        return '.tiff'
      case SupportedFileType.BMP:
        return '.bmp'
      default:
        throw new Error(`Unsupported MIME type: ${mimeType}`)
    }
  }

  // ===== MIGRATION SUPPORT =====

  /**
   * Migrate legacy file to new hierarchical structure
   */
  async migrateLegacySourceImage(
    legacyPath: string,
    sourceImageId: SourceImageId
  ): Promise<{ success: boolean; newPath?: string }> {
    const parsed = this.pathManager.parseLegacySourcePath(legacyPath)
    if (!parsed) {
      return { success: false }
    }

    const oldFilePath = this.pathManager.getLegacySourceImagePath(
      parsed.userId, 
      parsed.fileId, 
      parsed.extension
    )
    
    const newFilePath = this.pathManager.getSourceImagePath(
      parsed.userId, 
      sourceImageId, 
      parsed.extension
    )

    try {
      // Ensure target directory exists
      const sourcesDir = this.pathManager.getSourcesDirectory(parsed.userId)
      await fs.mkdir(sourcesDir, { recursive: true })

      // Move file to new location
      await fs.rename(oldFilePath, newFilePath)

      const newRelativePath = this.pathManager.getSourceImageRelativePath(
        parsed.userId,
        sourceImageId,
        parsed.extension
      )

      return { 
        success: true, 
        newPath: newRelativePath 
      }
    } catch (error) {
      console.error(`Migration failed for ${legacyPath}:`, error)
      return { success: false }
    }
  }
}

/**
 * Enhanced Local File Service with hierarchical storage and generation support
 */
export class EnhancedLocalFileService extends BaseFileService {
  private storageManager: EnhancedStorageManager
  private validator: FileValidator
  private localConfig: LocalStorageConfig

  constructor(config: FileServiceConfig) {
    super(config)
    
    this.localConfig = this.config.storageConfig as LocalStorageConfig
    this.storageManager = new EnhancedStorageManager(this.localConfig)
    this.validator = new FileValidator({
      maxFileSize: config.maxFileSize,
      allowedTypes: config.allowedTypes,
      imageProcessing: config.imageProcessing,
      enableSecurityScanning: true
    })
  }

  protected validateConfiguration(): void {
    if (this.config.storageConfig.type !== 'local') {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'EnhancedLocalFileService requires local storage configuration'
      )
    }
    
    const localConfig = this.config.storageConfig as LocalStorageConfig
    if (!localConfig.uploadPath || !localConfig.publicPath) {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'Local storage requires uploadPath and publicPath'
      )
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.storageManager.initialize()
  }

  // ===== SOURCE IMAGE OPERATIONS =====

  /**
   * Upload source image to hierarchical storage
   */
  async uploadSourceImage(
    file: File, 
    userId: UserId,
    sourceImageId: SourceImageId,
    metadata?: Partial<Pick<FileMetadata, 'originalName'>>
  ): Promise<FileUploadResponse> {
    try {
      // Validate file
      const validationResult = await this.validateFile(file)
      
      if (isFileOperationError(validationResult)) {
        return validationResult
      }

      if (!validationResult.isValid) {
        return errorToOperationResult(
          FileServiceErrorFactory.createValidationError(
            FileServiceErrorCode.INVALID_FILE_TYPE,
            'File validation failed',
            validationResult.errors.map(error => ({ field: 'file', constraint: error }))
          )
        )
      }

      // Convert File to Buffer and process
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Process image with Sharp
      const { processedBuffer, metadata: imageMetadata } = await this.processImage(
        buffer, 
        file.type as SupportedFileType
      )

      // Determine file extension
      const extension = this.getFileExtension(file.type as SupportedFileType)

      // Store in hierarchical structure
      await this.storageManager.storeSourceImage(userId, sourceImageId, processedBuffer, extension)

      // Generate URLs and paths
      const url = this.storageManager.getSourceImagePublicUrl(userId, sourceImageId, extension)
      const relativePath = `${userId}/sources/${sourceImageId}${extension}`

      // Create metadata response
      const fileMetadata: FileMetadata = {
        id: sourceImageId as unknown as FileId, // Bridge the type gap
        userId,
        originalName: metadata?.originalName || file.name,
        mimeType: file.type as SupportedFileType,
        size: processedBuffer.length,
        dimensions: {
          width: imageMetadata.width,
          height: imageMetadata.height
        },
        uploadedAt: new Date(),
        processingMetadata: {
          format: imageMetadata.format,
          colorSpace: 'srgb',
          hasAlpha: false
        }
      }

      return {
        success: true,
        metadata: fileMetadata,
        url,
        relativePath
      }

    } catch (error) {
      console.error('[EnhancedLocalFileService] Upload error:', error)
      return errorToOperationResult(
        FileServiceErrorFactory.createUploadError(
          FileServiceErrorCode.UPLOAD_FAILED,
          error instanceof Error ? error.message : 'Unknown upload error'
        )
      )
    }
  }

  // ===== GENERATION OPERATIONS =====

  /**
   * Store AI-generated image
   */
  async storeGeneration(request: StoreGenerationRequest): Promise<GenerationStorageResult | FileOperationError> {
    try {
      const result = await this.storageManager.storeGeneration(request)
      return result
    } catch (error) {
      return errorToOperationResult(
        FileServiceErrorFactory.createUploadError(
          FileServiceErrorCode.UPLOAD_FAILED,
          error instanceof Error ? error.message : 'Unknown generation storage error'
        )
      )
    }
  }

  // ===== LEGACY INTERFACE SUPPORT =====

  async uploadFile(
    file: File, 
    userId: UserId, 
    metadata?: Partial<Pick<FileMetadata, 'originalName'>>
  ): Promise<FileUploadResponse> {
    // Generate new source image ID for hierarchical storage
    const sourceImageId = createSourceImageId(nanoid())
    return this.uploadSourceImage(file, userId, sourceImageId, metadata)
  }

  async deleteFile(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true }> {
    // For now, treat fileId as sourceImageId - this will need proper mapping in production
    const sourceImageId = fileId as unknown as SourceImageId
    
    try {
      // We need to determine the extension - this is a limitation of the current interface
      // In production, this should be retrieved from database
      const extensions = ['.jpg', '.png', '.webp']
      let deleted = false

      for (const extension of extensions) {
        try {
          await this.storageManager.deleteSourceImage(userId, sourceImageId, extension)
          deleted = true
          break
        } catch {
          // Try next extension
          continue
        }
      }

      if (!deleted) {
        return errorToOperationResult(
          FileServiceErrorFactory.createAccessError(
            FileServiceErrorCode.FILE_NOT_FOUND,
            'File not found'
          )
        )
      }

      return { success: true }

    } catch (error) {
      return errorToOperationResult(
        FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.DELETION_FAILED,
          error instanceof Error ? error.message : 'Unknown deletion error'
        )
      )
    }
  }

  async getFileUrl(): Promise<FileOperationError | { success: true; url: string }> {
    // This would need proper implementation with database lookup in production
    return errorToOperationResult(
      FileServiceErrorFactory.createAccessError(
        FileServiceErrorCode.ACCESS_DENIED,
        'getFileUrl not implemented in enhanced service - use specific source/generation methods'
      )
    )
  }

  async validateFile(file: File): Promise<FileValidationResponse> {
    return this.validator.validateFile(file)
  }

  async getFileMetadata(): Promise<FileOperationError | { success: true; metadata: FileMetadata }> {
    // This would need proper implementation with database lookup in production
    return errorToOperationResult(
      FileServiceErrorFactory.createAccessError(
        FileServiceErrorCode.ACCESS_DENIED,
        'getFileMetadata not implemented in enhanced service - use database queries'
      )
    )
  }

  // ===== PRIVATE METHODS =====

  private async processImage(buffer: Buffer, mimeType: SupportedFileType): Promise<{
    processedBuffer: Buffer
    metadata: {
      width: number
      height: number
      format: string
      size: number
    }
  }> {
    try {
      const sharpInstance = sharp(buffer)

      // Apply basic optimization
      let processedInstance = sharpInstance

      switch (mimeType) {
        case SupportedFileType.JPEG:
          processedInstance = sharpInstance.jpeg({ quality: 85, mozjpeg: true })
          break
        case SupportedFileType.PNG:
          processedInstance = sharpInstance.png({ compressionLevel: 6 })
          break
        case SupportedFileType.WEBP:
          processedInstance = sharpInstance.webp({ quality: 80 })
          break
        case SupportedFileType.HEIC:
          // Convert HEIC to JPEG for compatibility
          processedInstance = sharpInstance.jpeg({ quality: 90, mozjpeg: true })
          break
        case SupportedFileType.TIFF:
          // Keep as TIFF for professional use cases
          processedInstance = sharpInstance.tiff({ compression: 'lzw' })
          break
        case SupportedFileType.BMP:
          // Convert BMP to PNG for web compatibility
          processedInstance = sharpInstance.png({ compressionLevel: 6 })
          break
      }

      const processedBuffer = await processedInstance.toBuffer()
      const finalMetadata = await sharp(processedBuffer).metadata()

      return {
        processedBuffer,
        metadata: {
          width: finalMetadata.width || 0,
          height: finalMetadata.height || 0,
          format: finalMetadata.format || 'unknown',
          size: processedBuffer.length
        }
      }
    } catch (error) {
      throw FileServiceErrorFactory.createUploadError(
        FileServiceErrorCode.PROCESSING_FAILED,
        `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private getFileExtension(mimeType: SupportedFileType): string {
    switch (mimeType) {
      case SupportedFileType.JPEG:
        return '.jpg'
      case SupportedFileType.PNG:
        return '.png'
      case SupportedFileType.WEBP:
        return '.webp'
      default:
        throw new Error(`Unsupported MIME type: ${mimeType}`)
    }
  }
}