// Re-export shared types to maintain compatibility
export type { GeneratedVariant, SourceImage, SourceImageWithProject } from "@/lib/shared/types/image-types"

export interface MockGeneratedImage {
  id: string;
  url: string;
}

export const roomTypes = [
  "Living Room", "Bedroom", "Kitchen", "Dining Room", "Bathroom", 
  "Home Office", "Kids Room",
]

export const interiorStyles = [
  "Modern", "Midcentury", "Scandinavian", "Luxury", "Coastal", 
  "Industrial", "Minimalist", "Standard",
]

export const mockGeneratedImages: MockGeneratedImage[] = [
  { id: 'gen1', url: '/mock-generations/mock-image-1.png' },
  { id: 'gen2', url: '/mock-generations/mock-image-2.png' },
  { id: 'gen3', url: '/mock-generations/mock-image-3.png' },
];

// Utility functions to convert between UI display values and database enum values
export const convertRoomTypeToEnum = (displayValue: string): string => {
  return displayValue.toLowerCase().replaceAll(' ', '_');
};

export const convertRoomTypeFromEnum = (enumValue: string): string => {
  return enumValue.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const convertStyleToEnum = (displayValue: string): string => {
  return displayValue.toLowerCase();
};

export const convertStyleFromEnum = (enumValue: string): string => {
  return enumValue.charAt(0).toUpperCase() + enumValue.slice(1);
};
