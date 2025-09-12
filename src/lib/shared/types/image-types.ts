// Centralized image type definitions to avoid conflicts across components

export interface GeneratedVariant {
  id: string
  sourceImageId: string
  userId: string
  projectId: string
  stagedImagePath: string | null
  variationIndex: number
  roomType: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'dining_room' | 'kids_room' | 'home_office'
  stagingStyle: 'modern' | 'midcentury' | 'scandinavian' | 'luxury' | 'coastal' | 'industrial' | 'minimalist' | 'standard'
  operationType: 'stage_empty' | 'remove_furniture'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  jobId: string | null
  errorMessage: string | null
  processingTimeMs: number | null
  aiGenerationParams: any | null
  createdAt: Date
  completedAt: Date | null
}

// Base source image interface (matches database schema with nullable fields from LEFT JOIN)
export interface SourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: string | null  // Nullable when no generations exist
  stagingStyle: string | null  // Nullable when no generations exist  
  operationType: string | null  // Nullable when no generations exist
  createdAt: Date
  variants: GeneratedVariant[]
}

// Extended interface for components that need project context
export interface SourceImageWithProject extends SourceImage {
  projectId: string
  projectName: string
}

// Type for image selection handlers (accepts either variant)
export type ImageSelectHandler = (imageId: string, sourceImage: SourceImage | SourceImageWithProject) => void