import { NextRequest, NextResponse } from 'next/server'
import { validateApiSession } from '@/lib/auth-utils'
import { quickStart } from '@/lib/file-service'
import { createUserId, FileServiceErrorCode, isUploadError, isValidationError } from '@/lib/file-service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILES = 5

interface UploadResponse {
  success: boolean
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
  message?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Validate authentication
    const session = await validateApiSession(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    // Validate request
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Too many files. Maximum ${MAX_FILES} files allowed.` 
        },
        { status: 400 }
      )
    }

    // Validate individual files
    const fileValidationErrors: Array<{ fileName: string; error: string; code?: string }> = []
    
    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        fileValidationErrors.push({
          fileName: file.name,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          code: 'file-too-large'
        })
        continue
      }

      if (file.size === 0) {
        fileValidationErrors.push({
          fileName: file.name,
          error: 'File is empty.',
          code: 'file-empty'
        })
        continue
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        fileValidationErrors.push({
          fileName: file.name,
          error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
          code: 'file-invalid-type'
        })
        continue
      }
    }

    // If all files have validation errors, return early
    if (fileValidationErrors.length === files.length) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'All files failed validation',
          errors: fileValidationErrors 
        },
        { status: 400 }
      )
    }

    // Process valid files
    const fileService = quickStart()
    const userId = createUserId(session.user.id)
    const uploadResults: Array<{
      id: string
      fileName: string
      originalFileName: string
      fileSize: number
      fileType: string
      relativePath: string
      uploadedAt: string
    }> = []
    const uploadErrors: Array<{ fileName: string; error: string; code?: string }> = []

    for (const file of files) {
      // Skip files that failed validation
      const hasValidationError = fileValidationErrors.some(error => error.fileName === file.name)
      if (hasValidationError) {
        continue
      }

      try {
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer())
        
        // Upload file using FileService
        const uploadResult = await fileService.uploadFile(buffer, file.name, userId)

        if (uploadResult.success && uploadResult.data) {
          uploadResults.push({
            id: uploadResult.data.fileId,
            fileName: uploadResult.data.fileName,
            originalFileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            relativePath: uploadResult.data.relativePath,
            uploadedAt: new Date().toISOString()
          })
        } else {
          // Handle FileService errors
          const errorMessage = uploadResult.error?.message || 'Unknown upload error'
          uploadErrors.push({
            fileName: file.name,
            error: errorMessage,
            code: uploadResult.error?.code
          })
        }
      } catch (error) {
        console.error(`Upload error for file ${file.name}:`, error)
        
        // Determine error type and message
        let errorMessage = 'Upload failed'
        let errorCode: string | undefined

        if (isValidationError(error)) {
          errorMessage = error.message
          errorCode = FileServiceErrorCode.VALIDATION_ERROR
        } else if (isUploadError(error)) {
          errorMessage = error.message
          errorCode = FileServiceErrorCode.UPLOAD_ERROR
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        uploadErrors.push({
          fileName: file.name,
          error: errorMessage,
          code: errorCode
        })
      }
    }

    // Combine all errors
    const allErrors = [...fileValidationErrors, ...uploadErrors]

    // Determine response status and message
    const hasSuccesses = uploadResults.length > 0
    const hasErrors = allErrors.length > 0

    let message: string
    let status = 200

    if (hasSuccesses && !hasErrors) {
      message = `Successfully uploaded ${uploadResults.length} file${uploadResults.length === 1 ? '' : 's'}.`
    } else if (hasSuccesses && hasErrors) {
      message = `Uploaded ${uploadResults.length} file${uploadResults.length === 1 ? '' : 's'}, ${allErrors.length} failed.`
      status = 207 // Multi-status
    } else {
      message = 'All uploads failed.'
      status = 400
    }

    return NextResponse.json(
      {
        success: hasSuccesses,
        message,
        files: uploadResults.length > 0 ? uploadResults : undefined,
        errors: allErrors.length > 0 ? allErrors : undefined
      },
      { status }
    )

  } catch (error) {
    console.error('Upload API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      success: false, 
      message: 'Method not allowed. Use POST to upload files.' 
    },
    { status: 405 }
  )
}