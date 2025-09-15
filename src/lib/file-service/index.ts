/**
 * Hukasa File Service - Public API
 * 
 * Provides a clean, typed interface for file operations in the Hukasa AI virtual staging platform.
 * Supports local storage with migration path to cloud providers.
 */

import { FileServiceConfigManager } from './config'
import { createFileService, createDefaultFileService } from './factory'

// Core types and interfaces
export type {
  FileService,
  FileServiceFactory as IFileServiceFactory,
  FileServiceConfig,
  FileMetadata,
  FileUploadResult,
  FileUploadResponse,
  FileValidationResult,
  FileValidationResponse,
  FileOperationError,
  LocalStorageConfig,
  S3StorageConfig,
  ImageProcessingConfig,
  FileId,
  UserId,
  CreateFileId,
  CreateUserId
} from './types'

export {
  FileStorageProvider,
  SupportedFileType,
  createFileId,
  createUserId,
  isFileUploadResult,
  isFileOperationError,
  isValidationResult
} from './types'

// Error handling
export type {
  FileServiceError,
  FileServiceErrorType,
  ValidationError,
  UploadError,
  AccessError,
  SystemError
} from './errors'

export {
  FileServiceErrorCode,
  FileServiceErrorFactory,
  ValidationErrorMessages,
  AccessErrorMessages,
  UploadErrorMessages,
  SystemErrorMessages,
  isValidationError,
  isUploadError,
  isAccessError,
  isSystemError,
  errorToOperationResult
} from './errors'

// Configuration management
export {
  DEFAULT_CONFIG,
  ENV_KEYS,
  FileServiceConfigBuilder,
  EnvironmentConfigLoader,
  ConfigValidator,
  FileServiceConfigManager
} from './config'

// File validation
export {
  FileValidator,
  MimeTypeValidator,
  createFileValidator
} from './validation'

export type { FileValidationOptions } from './validation'

// Factory pattern
export {
  FileServiceFactory,
  BaseFileService,
  FileServiceFactoryBuilder,
  FileServiceFactoryUtils,
  fileServiceFactory,
  createDefaultFileService
} from './factory'

// Note: LocalFileService removed - using EnhancedLocalFileService directly in upload routes
// Factory pattern kept for future cloud providers

// Convenience functions for common operations
export const getFileServiceConfig = () => {
  return FileServiceConfigManager.getInstance().getConfig()
}

export const createConfiguredFileService = () => {
  const config = getFileServiceConfig()
  return createFileService(config)
}

// Version info
export const FILE_SERVICE_VERSION = '1.0.0'

/**
 * Quick start helper - creates a file service with default configuration
 * 
 * @example
 * ```typescript
 * import { quickStart } from '@/lib/file-service'
 * 
 * const fileService = quickStart()
 * const result = await fileService.uploadFile(file, userId)
 * ```
 */
export const quickStart = () => {
  try {
    return createConfiguredFileService()
  } catch (error) {
    console.warn('Failed to create configured file service, falling back to default:', error)
    return createDefaultFileService()
  }
}