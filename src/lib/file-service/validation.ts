/**
 * File Validation System with Sharp Integration
 * 
 * Provides comprehensive file validation including format verification,
 * size constraints, security scanning, and image processing validation.
 */

import sharp from 'sharp'
import { 
  FileValidationResponse, 
  SupportedFileType,
  ImageProcessingConfig
} from './types'
import { 
  FileServiceErrorFactory, 
  FileServiceErrorCode,
  ValidationErrorMessages,
  errorToOperationResult
} from './errors'

/**
 * File validation options
 */
export interface FileValidationOptions {
  maxFileSize: number
  allowedTypes: readonly SupportedFileType[]
  imageProcessing: ImageProcessingConfig
  enableSecurityScanning?: boolean
}

/**
 * Security scanning result
 */
interface SecurityScanResult {
  isSafe: boolean
  risks: string[]
}

/**
 * Core file validator class
 */
export class FileValidator {
  private options: FileValidationOptions

  constructor(options: FileValidationOptions) {
    this.options = options
  }

  /**
   * Validates a file against all configured rules
   */
  async validateFile(file: File): Promise<FileValidationResponse> {
    try {
      const errors: string[] = []

      // Basic validation
      const basicValidation = this.validateBasicProperties(file)
      if (!basicValidation.isValid) {
        errors.push(...basicValidation.errors)
      }

      // If basic validation fails, don't proceed with image processing
      if (errors.length > 0) {
        return {
          isValid: false,
          errors: errors
        }
      }

      // Convert File to Buffer for Sharp processing
      const buffer = await this.fileToBuffer(file)

      // Image-specific validation using Sharp
      const imageValidation = await this.validateWithSharp(buffer, file.type as SupportedFileType)
      if (!imageValidation.isValid) {
        errors.push(...imageValidation.errors)
      }

      // Security scanning if enabled
      if (this.options.enableSecurityScanning) {
        const securityScan = await this.performSecurityScan(buffer)
        if (!securityScan.isSafe) {
          errors.push(...securityScan.risks)
        }
      }

      const isValid = errors.length === 0

      return {
        isValid,
        errors,
        metadata: isValid ? imageValidation.metadata : undefined
      }

    } catch (error) {
      return errorToOperationResult(
        FileServiceErrorFactory.createValidationError(
          FileServiceErrorCode.CORRUPTED_FILE,
          `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          [{ field: 'file', constraint: 'readable' }]
        )
      )
    }
  }

  /**
   * Validates basic file properties (type, size)
   */
  private validateBasicProperties(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate file type
    if (!this.options.allowedTypes.includes(file.type as SupportedFileType)) {
      errors.push(
        ValidationErrorMessages.INVALID_FILE_TYPE(
          this.options.allowedTypes.map(type => type.split('/')[1])
        )
      )
    }

    // Validate file size
    if (file.size > this.options.maxFileSize) {
      errors.push(ValidationErrorMessages.FILE_TOO_LARGE(this.options.maxFileSize))
    }

    // Check for empty files
    if (file.size === 0) {
      errors.push('File cannot be empty')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validates file using Sharp image processing library
   */
  private async validateWithSharp(
    buffer: Buffer, 
    mimeType: SupportedFileType
  ): Promise<{ isValid: boolean; errors: string[]; metadata?: { width: number; height: number; format: string; size: number } }> {
    const errors: string[] = []

    try {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()

      // Validate that Sharp can read the file
      if (!metadata.format) {
        errors.push('File format could not be determined or is not supported')
        return { isValid: false, errors }
      }

      // Validate format matches MIME type
      const formatValid = this.validateFormatConsistency(metadata.format, mimeType)
      if (!formatValid) {
        errors.push(`File content does not match declared type ${mimeType}`)
      }

      // Validate dimensions
      if (metadata.width && metadata.height) {
        const dimensionValidation = this.validateImageDimensions(metadata.width, metadata.height)
        if (!dimensionValidation.isValid) {
          errors.push(...dimensionValidation.errors)
        }
      } else {
        errors.push('Could not determine image dimensions')
      }

      // Validate image integrity
      try {
        await sharpInstance.clone().resize(1, 1).toBuffer()
      } catch {
        errors.push('Image file appears to be corrupted or invalid')
      }

      return {
        isValid: errors.length === 0,
        errors,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format,
          size: buffer.length
        }
      }

    } catch (error) {
      errors.push(
        error instanceof Error 
          ? `Image processing error: ${error.message}`
          : 'Unknown image processing error'
      )
      
      return { isValid: false, errors }
    }
  }

  /**
   * Validates format consistency between detected format and MIME type
   */
  private validateFormatConsistency(detectedFormat: string, mimeType: SupportedFileType): boolean {
    const formatMap: Record<string, SupportedFileType> = {
      'jpeg': SupportedFileType.JPEG,
      'jpg': SupportedFileType.JPEG,
      'png': SupportedFileType.PNG,
      'webp': SupportedFileType.WEBP
    }

    const expectedMimeType = formatMap[detectedFormat.toLowerCase()]
    return expectedMimeType === mimeType
  }

  /**
   * Validates image dimensions against configured limits
   */
  private validateImageDimensions(width: number, height: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const { maxDimensions } = this.options.imageProcessing

    if (width > maxDimensions.width || height > maxDimensions.height) {
      errors.push(
        ValidationErrorMessages.INVALID_DIMENSIONS(maxDimensions.width, maxDimensions.height)
      )
    }

    // Check minimum dimensions (prevent 1x1 pixel images)
    if (width < 10 || height < 10) {
      errors.push('Image dimensions must be at least 10x10 pixels')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Performs security scanning on the file buffer
   */
  private async performSecurityScan(buffer: Buffer): Promise<SecurityScanResult> {
    const risks: string[] = []

    try {
      // Check for suspicious file signatures
      const suspiciousPatterns = [
        // Check for embedded script patterns
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        // Check for PHP code patterns
        /<\?php[\s\S]*?\?>/gi,
        // Check for suspicious binary patterns that might indicate malware
        /\x00{4,}/, // Multiple null bytes
      ]

      const bufferString = buffer.toString('binary')
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bufferString)) {
          risks.push('File contains potentially malicious patterns')
          break
        }
      }

      // Additional security checks using Sharp
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()

      // Check for unusual metadata that might indicate tampering
      if (metadata.exif && Buffer.byteLength(metadata.exif) > 64000) {
        risks.push('Image contains unusually large EXIF data')
      }

      // Check for embedded color profiles that might be malicious
      if (metadata.icc && Buffer.byteLength(metadata.icc) > 100000) {
        risks.push('Image contains unusually large color profile')
      }

      return {
        isSafe: risks.length === 0,
        risks
      }

    } catch {
      // If security scanning fails, err on the side of caution
      risks.push('Security scan could not be completed')
      return {
        isSafe: false,
        risks
      }
    }
  }

  /**
   * Converts a File object to Buffer
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * MIME type utilities
 */
export class MimeTypeValidator {
  private static readonly MIME_TYPE_SIGNATURES: Record<string, number[][]> = {
    [SupportedFileType.JPEG]: [
      [0xFF, 0xD8, 0xFF], // Standard JPEG signature
    ],
    [SupportedFileType.PNG]: [
      [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
    ],
    [SupportedFileType.WEBP]: [
      [0x52, 0x49, 0x46, 0x46], // RIFF signature (WebP container)
    ]
  }

  /**
   * Validates file signature matches declared MIME type
   */
  static validateFileSignature(buffer: Buffer, mimeType: SupportedFileType): boolean {
    const signatures = this.MIME_TYPE_SIGNATURES[mimeType]
    if (!signatures) return false

    return signatures.some(signature => 
      signature.every((byte, index) => buffer[index] === byte)
    )
  }

  /**
   * Detects MIME type from file signature
   */
  static detectMimeType(buffer: Buffer): SupportedFileType | null {
    for (const [mimeType, signatures] of Object.entries(this.MIME_TYPE_SIGNATURES)) {
      for (const signature of signatures) {
        if (signature.every((byte, index) => buffer[index] === byte)) {
          return mimeType as SupportedFileType
        }
      }
    }
    return null
  }
}

/**
 * Convenience function to create validator with common settings
 */
export const createFileValidator = (options: FileValidationOptions): FileValidator => {
  return new FileValidator(options)
}