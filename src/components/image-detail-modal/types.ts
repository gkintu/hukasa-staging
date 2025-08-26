export interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

export interface SourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

export interface MockGeneratedImage {
  id: string;
  url: string;
}

export const roomTypes = [
  "Living Room", "Bedroom", "Kitchen", "Dining Room", "Bathroom", 
  "Home Office", "Kids Room", "Master Bedroom",
]

export const interiorStyles = [
  "Modern", "Midcentury", "Scandinavian", "Luxury", "Coastal", 
  "Farmhouse", "Industrial", "Bohemian", "Minimalist",
]

export const mockGeneratedImages: MockGeneratedImage[] = [
  { id: 'gen1', url: '/mock-generations/mock-image-1.png' },
  { id: 'gen2', url: '/mock-generations/mock-image-2.png' },
  { id: 'gen3', url: '/mock-generations/mock-image-3.png' },
];
