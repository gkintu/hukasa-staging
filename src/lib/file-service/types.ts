/**
 * Core FileService Types and Interfaces
 * 
 * Provides type-safe abstractions for file operations across different storage providers.
 * Designed for migration flexibility from local storage to cloud providers like S3.
 */

// Branded types for enhanced type safety
export type FileId = string & { readonly __brand: 'FileId' }
export type UserId = string & { readonly __brand: 'UserId' }

// Storage provider enumeration
export enum FileStorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  MEMORY = 'memory' // For testing
}

// Supported file types for Hukasa AI virtual staging
export enum SupportedFileType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  HEIC = 'image/heic',    // iPhone/modern mobile photos
  TIFF = 'image/tiff',    // Professional photography
  BMP = 'image/bmp'       // Legacy Windows format
}

// File metadata interface
export interface FileMetadata {
  readonly id: FileId
  readonly userId: UserId
  readonly originalName: string
  readonly mimeType: SupportedFileType
  readonly size: number
  readonly dimensions?: {
    width: number
    height: number
  }
  readonly uploadedAt: Date
  readonly processingMetadata?: {
    format: string
    colorSpace: string
    hasAlpha: boolean
    orientation?: number
  }
}

// File upload result
export interface FileUploadResult {
  readonly success: true
  readonly metadata: FileMetadata
  readonly url: string
  readonly relativePath: string
}

// File validation result
export interface FileValidationResult {
  readonly isValid: boolean
  readonly errors: readonly string[]
  readonly metadata?: {
    width: number
    height: number
    format: string
    size: number
  }
}

// File operation error result (using discriminated union)
export interface FileOperationError {
  readonly success: false
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: Record<string, unknown>
  }
}

// Unified result types
export type FileUploadResponse = FileUploadResult | FileOperationError
export type FileValidationResponse = FileValidationResult | FileOperationError

// File service configuration interface
export interface FileServiceConfig {
  readonly provider: FileStorageProvider
  readonly maxFileSize: number // in bytes
  readonly allowedTypes: readonly SupportedFileType[]
  readonly storageConfig: LocalStorageConfig | S3StorageConfig
  readonly imageProcessing: ImageProcessingConfig
}

// Local storage configuration
export interface LocalStorageConfig {
  readonly type: 'local'
  readonly uploadPath: string
  readonly publicPath: string
  readonly createDirectories: boolean
}

// S3 storage configuration (for future use)
export interface S3StorageConfig {
  readonly type: 's3'
  readonly bucket: string
  readonly region: string
  readonly accessKeyId: string
  readonly secretAccessKey: string
  readonly publicUrlBase?: string
}

// Image processing configuration
export interface ImageProcessingConfig {
  readonly quality: {
    jpeg: number
    webp: number
    png: number
  }
  readonly maxDimensions: {
    width: number
    height: number
  }
  readonly enableOptimization: boolean
  readonly preserveMetadata: boolean
}

/**
 * Core FileService Interface
 * 
 * Abstract interface that all file service implementations must follow.
 * Provides a contract for file operations that works across storage providers.
 */
export interface FileService {
  /**
   * Uploads a file with validation and processing
   * @param file - The file to upload
   * @param userId - ID of the user uploading the file
   * @param metadata - Optional additional metadata
   */
  uploadFile(
    file: File,
    userId: UserId,
    metadata?: Partial<Pick<FileMetadata, 'originalName'>>
  ): Promise<FileUploadResponse>

  /**
   * Deletes a file with ownership verification
   * @param fileId - Unique identifier of the file
   * @param userId - ID of the user requesting deletion (for ownership check)
   */
  deleteFile(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true }>

  /**
   * Generates a secure URL for file access
   * @param fileId - Unique identifier of the file
   * @param userId - ID of the user requesting access (for ownership check)
   */
  getFileUrl(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true; url: string }>

  /**
   * Validates a file before upload
   * @param file - The file to validate
   */
  validateFile(file: File): Promise<FileValidationResponse>

  /**
   * Gets file metadata by ID with ownership verification
   * @param fileId - Unique identifier of the file
   * @param userId - ID of the user requesting metadata
   */
  getFileMetadata(fileId: FileId, userId: UserId): Promise<FileOperationError | { success: true; metadata: FileMetadata }>
}

/**
 * File service factory interface
 * Abstracts the creation of file service instances based on configuration
 */
export interface FileServiceFactory {
  /**
   * Creates a file service instance based on the provided configuration
   * @param config - Configuration object specifying provider and settings
   */
  createFileService(config: FileServiceConfig): FileService
}

// Utility types for enhanced type safety
export type CreateFileId = () => FileId
export type CreateUserId = (id: string) => UserId

// Helper functions for branded types
export const createFileId = (id: string): FileId => id as FileId
export const createUserId = (id: string): UserId => id as UserId

// Type guards
export const isFileUploadResult = (result: FileUploadResponse): result is FileUploadResult => {
  return result.success === true
}

export const isFileOperationError = (result: FileUploadResponse | FileValidationResponse | { success: boolean }): result is FileOperationError => {
  return 'success' in result && result.success === false
}

export const isValidationResult = (result: FileValidationResponse): result is FileValidationResult => {
  return !('success' in result) && 'isValid' in result
}