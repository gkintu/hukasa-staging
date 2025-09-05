import { FeedbackMessage, RejectedFile, UploadItem } from './index'

export interface UploadResult {
  success: boolean
  message: string
  files?: Array<{
    id: string
    fileName: string
    originalFileName: string
    fileSize: number
    fileType: string
    relativePath: string
    uploadedAt: string
  }>
  errors?: Array<{
    fileName: string
    error: string
    code?: string
  }>
}

export class UploadService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly ALLOWED_TYPES = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp',
    'image/heic',
    'image/tiff', 
    'image/bmp'
  ]
  private static readonly MAX_FILES = 5

  static validateFiles(files: File[]): {
    validFiles: File[]
    rejectedFiles: RejectedFile[]
    errors: string[]
  } {
    const validFiles: File[] = []
    const rejectedFiles: RejectedFile[] = []
    const errors: string[] = []

    // Check total file count
    if (files.length > this.MAX_FILES) {
      errors.push(`Too many files selected. Maximum ${this.MAX_FILES} files allowed.`)
      return { validFiles: [], rejectedFiles: [], errors }
    }

    // Validate individual files
    for (const file of files) {
      const fileErrors: Array<{ code: string; message: string }> = []

      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        fileErrors.push({
          code: 'file-too-large',
          message: `File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB.`
        })
      }

      if (file.size === 0) {
        fileErrors.push({
          code: 'file-empty',
          message: 'File is empty.'
        })
      }

      // Check file type
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        fileErrors.push({
          code: 'file-invalid-type',
          message: `Invalid file type. Allowed: ${this.ALLOWED_TYPES.join(', ')}`
        })
      }

      // Check filename
      if (file.name.length === 0) {
        fileErrors.push({
          code: 'file-no-name',
          message: 'File has no name.'
        })
      }

      // Sanitize filename check
      if (!/^[a-zA-Z0-9._-]+$/.test(file.name.replace(/\.[^/.]+$/, ""))) {
        fileErrors.push({
          code: 'file-invalid-name',
          message: 'File name contains invalid characters.'
        })
      }

      if (fileErrors.length > 0) {
        rejectedFiles.push({ file, errors: fileErrors })
      } else {
        validFiles.push(file)
      }
    }

    return { validFiles, rejectedFiles, errors }
  }

  static async uploadFiles(files: File[], onProgress?: (progress: UploadItem[]) => void): Promise<UploadResult> {
    if (files.length === 0) {
      throw new Error('No files to upload')
    }

    // Create form data
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      // Simulate progress updates
      if (onProgress) {
        const initialProgress: UploadItem[] = files.map((file, index) => ({
          id: `upload-${index}-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          status: 'uploading',
          progress: 0
        }))
        onProgress(initialProgress)

        // Simulate progress increments
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 50))
          const updatedProgress = initialProgress.map(item => ({
            ...item,
            progress: i
          }))
          onProgress(updatedProgress)
        }
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result: UploadResult = await response.json()
      return result

    } catch (error) {
      console.error('Upload service error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
      
      return {
        success: false,
        message: errorMessage,
        errors: files.map(file => ({
          fileName: file.name,
          error: errorMessage,
          code: 'upload-failed'
        }))
      }
    }
  }

  static createErrorMessage(error: unknown, context: string = 'Upload'): FeedbackMessage {
    let message = 'An unexpected error occurred'
    const details: string[] = []

    if (error instanceof Error) {
      message = error.message
      
      // Add technical details for debugging
      if (error.stack) {
        details.push(`Stack: ${error.stack.split('\n')[0]}`)
      }
    } else if (typeof error === 'string') {
      message = error
    }

    return {
      id: `error-${Date.now()}`,
      type: 'error',
      title: `${context} Error`,
      message,
      details: details.length > 0 ? details : undefined,
      dismissible: true
    }
  }

  static createSuccessMessage(fileCount: number): FeedbackMessage {
    return {
      id: `success-${Date.now()}`,
      type: 'success',
      title: 'Upload Successful',
      message: `Successfully uploaded ${fileCount} file${fileCount === 1 ? '' : 's'}.`,
      dismissible: true
    }
  }

  static createValidationMessage(errors: string[]): FeedbackMessage {
    return {
      id: `validation-${Date.now()}`,
      type: 'warning',
      title: 'Validation Issues',
      message: 'Some files could not be processed due to validation errors.',
      details: errors,
      dismissible: true
    }
  }

  static retryableErrorCodes = new Set([
    'network-error',
    'server-error',
    'timeout',
    'unknown-error'
  ])

  static isRetryable(errorCode?: string): boolean {
    return errorCode ? this.retryableErrorCodes.has(errorCode) : false
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  static formatFileType(mimeType: string): string {
    return mimeType.split('/')[1]?.toUpperCase() || mimeType.toUpperCase()
  }

  static async previewFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file as string'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }
}