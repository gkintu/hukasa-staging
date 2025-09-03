// Re-export shared types to maintain compatibility
export type { GeneratedVariant, SourceImage, SourceImageWithProject } from "@/lib/shared/types/image-types"

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
