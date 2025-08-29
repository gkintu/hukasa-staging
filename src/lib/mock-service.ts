/**
 * Mock service for AI image generation during development
 * Provides deterministic, realistic simulation of the generation process
 */

// Simple hash function for deterministic mock selection
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Available mock images
const MOCK_IMAGES = [
  '/mock-generations/mock-image-1.png',
  '/mock-generations/mock-image-2.png',
  '/mock-generations/mock-image-3.png'
];

export interface MockGenerationConfig {
  processingDelay?: number;
  failureRate?: number; // 0-1, percentage of requests that should fail
  enableLogs?: boolean;
}

export interface MockGenerationRequest {
  imageId: string;
  roomType: string;
  interiorStyle: string;
  variationCount: number;
}

export interface MockGenerationResult {
  success: boolean;
  message: string;
  imageUrl?: string;
  shouldFail?: boolean;
}

/**
 * Get a deterministic mock image based on input parameters
 * Same inputs will always return the same mock image
 */
export function getMockImageForInput(
  imageId: string, 
  roomType: string, 
  interiorStyle: string,
  variationIndex: number = 0
): string {
  const inputString = `${imageId}-${roomType}-${interiorStyle}-${variationIndex}`;
  const hash = hashString(inputString);
  const imageIndex = hash % MOCK_IMAGES.length;
  return MOCK_IMAGES[imageIndex];
}

/**
 * Simulate the generation process with realistic delays and status updates
 */
export async function simulateMockGeneration(
  request: MockGenerationRequest,
  config: MockGenerationConfig = {}
): Promise<MockGenerationResult> {
  const {
    processingDelay = 2000,
    failureRate = 0.1, // 10% failure rate by default
    enableLogs = true
  } = config;

  const requestId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  
  if (enableLogs) {
    console.log(`[${requestId}] MOCK GENERATION - Starting for ${request.roomType} ${request.interiorStyle}`);
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, processingDelay));

  // Determine if this request should fail (for testing error handling)
  const shouldFail = Math.random() < failureRate;
  
  if (shouldFail) {
    if (enableLogs) {
      console.log(`[${requestId}] MOCK GENERATION - Simulated failure`);
    }
    return {
      success: false,
      message: 'Mock generation failed (simulated error for testing)',
      shouldFail: true
    };
  }

  // Get deterministic mock image
  const mockImageUrl = getMockImageForInput(
    request.imageId,
    request.roomType,
    request.interiorStyle,
    0 // For now, always use index 0, could be extended for multiple variants
  );

  if (enableLogs) {
    console.log(`[${requestId}] MOCK GENERATION - Success: ${mockImageUrl}`);
  }

  return {
    success: true,
    message: `Mock staging generated for ${request.roomType} in ${request.interiorStyle} style`,
    imageUrl: mockImageUrl
  };
}


/**
 * Get all available mock images (for testing/debugging)
 */
export function getAllMockImages(): string[] {
  return [...MOCK_IMAGES];
}