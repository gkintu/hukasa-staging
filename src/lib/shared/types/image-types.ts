// Centralized image type definitions to avoid conflicts across components

export interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
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