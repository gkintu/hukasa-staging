/**
 * Structured Error Handling for File Service
 * 
 * Provides consistent, typed error handling across all file service operations.
 * Includes specific error codes for different failure scenarios.
 */

// Error code enumeration for consistent error handling
export enum FileServiceErrorCode {
  // Validation errors
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  MALICIOUS_CONTENT = 'MALICIOUS_CONTENT',
  
  // Upload errors
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  
  // Access errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // System errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Operation errors
  DELETION_FAILED = 'DELETION_FAILED',
  URL_GENERATION_FAILED = 'URL_GENERATION_FAILED',
  METADATA_RETRIEVAL_FAILED = 'METADATA_RETRIEVAL_FAILED'
}

// Base error interface
export interface FileServiceError {
  readonly code: FileServiceErrorCode
  readonly message: string
  readonly details?: Record<string, unknown>
  readonly timestamp: Date
  readonly fileId?: string
  readonly userId?: string
}

// Specific error types for better type safety
export interface ValidationError extends FileServiceError {
  readonly code: 
    | FileServiceErrorCode.INVALID_FILE_TYPE 
    | FileServiceErrorCode.FILE_TOO_LARGE
    | FileServiceErrorCode.INVALID_DIMENSIONS
    | FileServiceErrorCode.CORRUPTED_FILE
    | FileServiceErrorCode.MALICIOUS_CONTENT
  readonly validationDetails: {
    readonly field: string
    readonly expected?: string | number
    readonly actual?: string | number
    readonly constraint?: string
  }[]
}

export interface UploadError extends FileServiceError {
  readonly code:
    | FileServiceErrorCode.UPLOAD_FAILED
    | FileServiceErrorCode.STORAGE_FULL
    | FileServiceErrorCode.PROCESSING_FAILED
  readonly uploadDetails?: {
    readonly stage: 'validation' | 'storage' | 'processing' | 'metadata'
    readonly bytesProcessed?: number
    readonly retryable: boolean
  }
}

export interface AccessError extends FileServiceError {
  readonly code:
    | FileServiceErrorCode.FILE_NOT_FOUND
    | FileServiceErrorCode.ACCESS_DENIED
    | FileServiceErrorCode.UNAUTHORIZED
  readonly accessDetails?: {
    readonly requestedOperation: 'read' | 'write' | 'delete'
    readonly resource: string
  }
}

export interface SystemError extends FileServiceError {
  readonly code:
    | FileServiceErrorCode.SERVICE_UNAVAILABLE
    | FileServiceErrorCode.CONFIGURATION_ERROR
    | FileServiceErrorCode.NETWORK_ERROR
  readonly systemDetails?: {
    readonly component: string
    readonly recoverable: boolean
    readonly retryAfter?: number
  }
}

// Union type for all possible errors
export type FileServiceErrorType = ValidationError | UploadError | AccessError | SystemError

/**
 * Error factory class for creating consistent error objects
 */
export class FileServiceErrorFactory {
  private static createBaseError(
    code: FileServiceErrorCode,
    message: string,
    details?: Record<string, unknown>,
    fileId?: string,
    userId?: string
  ): FileServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      fileId,
      userId
    }
  }

  static createValidationError(
    code: ValidationError['code'],
    message: string,
    validationDetails: ValidationError['validationDetails'],
    fileId?: string,
    userId?: string
  ): ValidationError {
    return {
      ...this.createBaseError(code, message, undefined, fileId, userId),
      code,
      validationDetails
    }
  }

  static createUploadError(
    code: UploadError['code'],
    message: string,
    uploadDetails?: UploadError['uploadDetails'],
    fileId?: string,
    userId?: string
  ): UploadError {
    return {
      ...this.createBaseError(code, message, undefined, fileId, userId),
      code,
      uploadDetails
    }
  }

  static createAccessError(
    code: AccessError['code'],
    message: string,
    accessDetails?: AccessError['accessDetails'],
    fileId?: string,
    userId?: string
  ): AccessError {
    return {
      ...this.createBaseError(code, message, undefined, fileId, userId),
      code,
      accessDetails
    }
  }

  static createSystemError(
    code: SystemError['code'],
    message: string,
    systemDetails?: SystemError['systemDetails'],
    fileId?: string,
    userId?: string
  ): SystemError {
    return {
      ...this.createBaseError(code, message, undefined, fileId, userId),
      code,
      systemDetails
    }
  }
}

/**
 * Common validation error messages
 */
export const ValidationErrorMessages = {
  INVALID_FILE_TYPE: (allowedTypes: string[]) => 
    `File type not supported. Allowed types: ${allowedTypes.join(', ')}`,
  FILE_TOO_LARGE: (maxSize: number) => 
    `File size exceeds maximum limit of ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
  INVALID_DIMENSIONS: (maxWidth: number, maxHeight: number) => 
    `Image dimensions exceed maximum of ${maxWidth}x${maxHeight}px`,
  CORRUPTED_FILE: () => 
    'File appears to be corrupted or invalid',
  MALICIOUS_CONTENT: () => 
    'File contains potentially malicious content'
} as const

/**
 * Common access error messages  
 */
export const AccessErrorMessages = {
  FILE_NOT_FOUND: () => 'Requested file was not found',
  ACCESS_DENIED: () => 'You do not have permission to access this file',
  UNAUTHORIZED: () => 'Authentication required to perform this operation'
} as const

/**
 * Common upload error messages
 */
export const UploadErrorMessages = {
  UPLOAD_FAILED: () => 'Failed to upload file due to server error',
  STORAGE_FULL: () => 'Storage capacity exceeded, please try again later',
  PROCESSING_FAILED: () => 'Failed to process uploaded file'
} as const

/**
 * System error messages
 */
export const SystemErrorMessages = {
  SERVICE_UNAVAILABLE: () => 'File service is temporarily unavailable',
  CONFIGURATION_ERROR: () => 'Service configuration error',
  NETWORK_ERROR: () => 'Network error occurred during file operation'
} as const

/**
 * Type guards for error discrimination
 */
export const isValidationError = (error: FileServiceErrorType): error is ValidationError => {
  return [
    FileServiceErrorCode.INVALID_FILE_TYPE,
    FileServiceErrorCode.FILE_TOO_LARGE,
    FileServiceErrorCode.INVALID_DIMENSIONS,
    FileServiceErrorCode.CORRUPTED_FILE,
    FileServiceErrorCode.MALICIOUS_CONTENT
  ].includes(error.code)
}

export const isUploadError = (error: FileServiceErrorType): error is UploadError => {
  return [
    FileServiceErrorCode.UPLOAD_FAILED,
    FileServiceErrorCode.STORAGE_FULL,
    FileServiceErrorCode.PROCESSING_FAILED
  ].includes(error.code)
}

export const isAccessError = (error: FileServiceErrorType): error is AccessError => {
  return [
    FileServiceErrorCode.FILE_NOT_FOUND,
    FileServiceErrorCode.ACCESS_DENIED,
    FileServiceErrorCode.UNAUTHORIZED
  ].includes(error.code)
}

export const isSystemError = (error: FileServiceErrorType): error is SystemError => {
  return [
    FileServiceErrorCode.SERVICE_UNAVAILABLE,
    FileServiceErrorCode.CONFIGURATION_ERROR,
    FileServiceErrorCode.NETWORK_ERROR
  ].includes(error.code)
}

/**
 * Utility function to convert error to operation result
 */
export const errorToOperationResult = (error: FileServiceErrorType) => ({
  success: false as const,
  error: {
    code: error.code,
    message: error.message,
    details: error.details
  }
})