/**
 * Local File Service Implementation
 * 
 * Provides local file system storage with Sharp image processing,
 * comprehensive validation, and secure file management.
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
  createFileId,
  isFileOperationError
} from '../types'
import { BaseFileService } from '../factory'
import { FileValidator } from '../validation'
import { 
  FileServiceErrorFactory, 
  FileServiceErrorCode,
  errorToOperationResult 
} from '../errors'

/**
 * Local file storage manager
 */
class LocalStorageManager {
  private config: LocalStorageConfig
  
  constructor(config: LocalStorageConfig) {
    this.config = config
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    if (this.config.createDirectories) {
      try {
        await fs.mkdir(this.config.uploadPath, { recursive: true })
      } catch (error) {
        throw FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.SERVICE_UNAVAILABLE,
          `Failed to create upload directory: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Generate secure file path for user
   */
  getUserDirectory(userId: UserId): string {
    return join(this.config.uploadPath, userId)
  }

  /**
   * Generate full file path
   */
  getFilePath(userId: UserId, fileId: FileId, extension: string): string {
    return join(this.getUserDirectory(userId), `${fileId}${extension}`)
  }

  /**
   * Store file data
   */
  async storeFile(userId: UserId, fileId: FileId, buffer: Buffer, extension: string): Promise<void> {
    const userDir = this.getUserDirectory(userId)
    const filePath = this.getFilePath(userId, fileId, extension)

    try {
      // Ensure user directory exists
      await fs.mkdir(userDir, { recursive: true })
      
      // Write file atomically
      await fs.writeFile(filePath, buffer)
    } catch (error) {
      throw FileServiceErrorFactory.createUploadError(
        FileServiceErrorCode.UPLOAD_FAILED,
        `Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete file
   */
  async deleteFile(userId: UserId, fileId: FileId, extension: string): Promise<void> {
    const filePath = this.getFilePath(userId, fileId, extension)

    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw FileServiceErrorFactory.createAccessError(
          FileServiceErrorCode.FILE_NOT_FOUND,
          'File not found'
        )
      }
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.DELETION_FAILED,
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(userId: UserId, fileId: FileId, extension: string): Promise<boolean> {
    const filePath = this.getFilePath(userId, fileId, extension)
    
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Generate public URL for file
   */
  getPublicUrl(userId: UserId, fileId: FileId, extension: string): string {
    return `${this.config.publicPath}/${userId}/${fileId}${extension}`
  }
}

/**
 * In-memory metadata repository for development
 * Ready for database migration
 */
class FileMetadataRepository {
  private metadata = new Map<FileId, FileMetadata>()

  async create(metadata: FileMetadata): Promise<void> {
    this.metadata.set(metadata.id, metadata)
  }

  async findById(fileId: FileId, userId: UserId): Promise<FileMetadata | null> {
    const metadata = this.metadata.get(fileId)
    
    if (!metadata) {
      return null
    }

    // Verify ownership
    if (metadata.userId !== userId) {
      return null
    }

    return metadata
  }

  async deleteById(fileId: FileId, userId: UserId): Promise<boolean> {
    const metadata = this.metadata.get(fileId)
    
    if (!metadata || metadata.userId !== userId) {
      return false
    }

    return this.metadata.delete(fileId)
  }

  async findByUserId(userId: UserId): Promise<FileMetadata[]> {
    return Array.from(this.metadata.values()).filter(
      metadata => metadata.userId === userId
    )
  }
}

/**
 * Image processor with Sharp optimization pipeline
 */
class ImageProcessor {
  private config: FileServiceConfig

  constructor(config: FileServiceConfig) {
    this.config = config
  }

  /**
   * Process and optimize image
   */
  async processImage(buffer: Buffer, mimeType: SupportedFileType): Promise<{
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
      const originalMetadata = await sharpInstance.metadata()

      // Validate dimensions
      if (originalMetadata.width && originalMetadata.height) {
        const { maxDimensions } = this.config.imageProcessing
        
        if (originalMetadata.width > maxDimensions.width || 
            originalMetadata.height > maxDimensions.height) {
          
          // Resize while maintaining aspect ratio
          sharpInstance.resize(maxDimensions.width, maxDimensions.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
        }
      }

      // Apply format-specific optimizations
      let processedInstance = sharpInstance

      switch (mimeType) {
        case SupportedFileType.JPEG:
          processedInstance = sharpInstance.jpeg({
            quality: this.config.imageProcessing.quality.jpeg,
            mozjpeg: true
          })
          break

        case SupportedFileType.PNG:
          processedInstance = sharpInstance.png({
            compressionLevel: this.config.imageProcessing.quality.png
          })
          break

        case SupportedFileType.WEBP:
          processedInstance = sharpInstance.webp({
            quality: this.config.imageProcessing.quality.webp
          })
          break

        case SupportedFileType.HEIC:
          // Convert HEIC to JPEG for compatibility
          processedInstance = sharpInstance.jpeg({
            quality: this.config.imageProcessing.quality.jpeg,
            mozjpeg: true
          })
          break

        case SupportedFileType.TIFF:
          // Keep as TIFF for professional use cases
          processedInstance = sharpInstance.tiff({ compression: 'lzw' })
          break

        case SupportedFileType.BMP:
          // Convert BMP to PNG for web compatibility
          processedInstance = sharpInstance.png({
            compressionLevel: this.config.imageProcessing.quality.png
          })
          break
      }

      // Apply metadata preservation if enabled
      if (this.config.imageProcessing.preserveMetadata) {
        processedInstance = processedInstance.withMetadata()
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
}

/**
 * Local File Service Implementation
 */
export class LocalFileService extends BaseFileService {
  private storageManager: LocalStorageManager
  private metadataRepository: FileMetadataRepository
  private validator: FileValidator
  private imageProcessor: ImageProcessor
  private localConfig: LocalStorageConfig

  constructor(config: FileServiceConfig) {
    super(config)

    // The `validateConfiguration` method (called by the super constructor) now handles validation.
    // We can safely cast here because the validation would have already thrown an error if the type was wrong.
    this.localConfig = this.config.storageConfig as LocalStorageConfig
    
    this.storageManager = new LocalStorageManager(this.localConfig)
    this.metadataRepository = new FileMetadataRepository()
    this.validator = new FileValidator({
      maxFileSize: config.maxFileSize,
      allowedTypes: config.allowedTypes,
      imageProcessing: config.imageProcessing,
      enableSecurityScanning: true
    })
    this.imageProcessor = new ImageProcessor(config)
  }

  protected validateConfiguration(): void {
    // This method is called from the BaseFileService constructor,
    // so it runs before the LocalFileService constructor body.
    // Therefore, we must use `this.config` instead of `this.localConfig`.
    if (this.config.storageConfig.type !== 'local') {
      throw FileServiceErrorFactory.createSystemError(
        FileServiceErrorCode.CONFIGURATION_ERROR,
        'LocalFileService requires local storage configuration'
      )
    }
    
    const localConfig = this.config.storageConfig as LocalStorageConfig;
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

  async uploadFile(
    file: File, 
    userId: UserId, 
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

      // Generate unique file ID
      const fileId = createFileId(nanoid())
      
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Process image
      const { processedBuffer, metadata: imageMetadata } = await this.imageProcessor.processImage(
        buffer, 
        file.type as SupportedFileType
      )

      // Determine file extension
      const extension = this.getFileExtension(file.type as SupportedFileType)

      // Store processed file
      await this.storageManager.storeFile(userId, fileId, processedBuffer, extension)

      // Create metadata
      const fileMetadata: FileMetadata = {
        id: fileId,
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

      // Save metadata
      await this.metadataRepository.create(fileMetadata)

      // Generate public URL and relative path
      const url = this.storageManager.getPublicUrl(userId, fileId, extension)
      const relativePath = `${userId}/${fileId}${extension}`

      return {
        success: true,
        metadata: fileMetadata,
        url,
        relativePath
      }

    } catch (error) {
      console.error('[LocalFileService] Caught error in uploadFile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during upload';
      return errorToOperationResult(
        FileServiceErrorFactory.createUploadError(
          FileServiceErrorCode.UPLOAD_FAILED,
          errorMessage
        )
      )
    }
  }

  async deleteFile(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true }> {
    try {
      // Get metadata to verify ownership and get extension
      const metadata = await this.metadataRepository.findById(fileId, userId)
      
      if (!metadata) {
        return errorToOperationResult(
          FileServiceErrorFactory.createAccessError(
            FileServiceErrorCode.FILE_NOT_FOUND,
            'File not found or access denied'
          )
        )
      }

      const extension = this.getFileExtension(metadata.mimeType)

      // Delete file from storage
      await this.storageManager.deleteFile(userId, fileId, extension)

      // Delete metadata
      await this.metadataRepository.deleteById(fileId, userId)

      return { success: true }

    } catch (error) {
      return errorToOperationResult(
        FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.DELETION_FAILED,
          `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  }

  async getFileUrl(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true; url: string }> {
    try {
      // Verify file exists and user has access
      const metadata = await this.metadataRepository.findById(fileId, userId)
      
      if (!metadata) {
        return errorToOperationResult(
          FileServiceErrorFactory.createAccessError(
            FileServiceErrorCode.FILE_NOT_FOUND,
            'File not found or access denied'
          )
        )
      }

      const extension = this.getFileExtension(metadata.mimeType)
      const url = this.storageManager.getPublicUrl(userId, fileId, extension)

      return {
        success: true,
        url
      }

    } catch (error) {
      return errorToOperationResult(
        FileServiceErrorFactory.createAccessError(
          FileServiceErrorCode.ACCESS_DENIED,
          `Access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  }

  async validateFile(file: File): Promise<FileValidationResponse> {
    return this.validator.validateFile(file)
  }

  async getFileMetadata(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true; metadata: FileMetadata }> {
    try {
      const metadata = await this.metadataRepository.findById(fileId, userId)
      
      if (!metadata) {
        return errorToOperationResult(
          FileServiceErrorFactory.createAccessError(
            FileServiceErrorCode.FILE_NOT_FOUND,
            'File not found or access denied'
          )
        )
      }

      return {
        success: true,
        metadata
      }

    } catch (error) {
      return errorToOperationResult(
        FileServiceErrorFactory.createSystemError(
          FileServiceErrorCode.METADATA_RETRIEVAL_FAILED,
          `Metadata access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
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
}