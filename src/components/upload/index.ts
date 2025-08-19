export { DropzoneCard } from './DropzoneCard'
export { ImagePreview } from './ImagePreview'
export { UploadProgress } from './UploadProgress'
export { UploadFeedback } from './UploadFeedback'
export { FileManager } from './FileManager'
export { UploadService } from './UploadService'

export type { 
  UploadItem 
} from './UploadProgress'

export type { 
  FeedbackMessage,
  RejectedFile 
} from './UploadFeedback'

// Types
type FileStatus = 'uploaded' | 'processing' | 'completed' | 'error'

export interface ManagedFile {
  id: string
  fileName: string
  originalFileName: string
  fileSize: number
  fileType: string
  status: FileStatus
  uploadedAt: Date
  thumbnailUrl?: string
  downloadUrl?: string
  processingProgress?: number
  error?: string
}