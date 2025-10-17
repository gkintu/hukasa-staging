import { 
  useMutation, 
  useQueryClient,
  UseMutationOptions
} from '@tanstack/react-query';
import { imageKeys } from '../utils/query-keys';
import { toast } from './use-toast';
import type { GeneratedVariant, SourceImage, VariantSummary } from '../types/image-types';

interface GenerateImagesRequest {
  sourceImageId: string;
  roomType: string;
  stagingStyle: string;
  imageCount: number;
}

interface GenerateImagesResponse {
  success: boolean;
  message: string;
  data: {
    generations: GeneratedVariant[];
  };
}

interface GenerationRequestBody {
  roomType: string;
  stagingStyle: string;
  imageCount: number;
  mockGenerations?: { id: string; url: string }[];
}

// A type for the query data that we will be optimistically updating
// It can be a single image or an array of images
type OptimisticImageData = SourceImage | SourceImage[];

// API call function
async function generateImages(request: GenerateImagesRequest): Promise<GenerateImagesResponse> {
  // Check if we're in mock mode and prepare mock data if needed
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_API === 'true';
  const requestBody: GenerationRequestBody = {
    roomType: request.roomType,
    stagingStyle: request.stagingStyle,
    imageCount: request.imageCount,
  };

  // Add mock data for mock mode
  if (isMockMode) {
    // Create simple mock generation data for the API
    requestBody.mockGenerations = Array.from({ length: request.imageCount }, (_, index) => ({
      id: `mock-${Date.now()}-${index}`,
      url: `/api/mock/generation-${index + 1}.jpg`
    }));
  }

  const response = await fetch(`/api/images/${request.sourceImageId}/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to generate images');
  }

  return response.json();
}

// Create optimistic variant data for immediate UI updates
function createOptimisticVariants(sourceImageId: string, count: number): GeneratedVariant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `optimistic-${Date.now()}-${index}`,
    sourceImageId,
    userId: '', // Will be populated by the server
    projectId: '', // Will be populated by the server
    stagedImagePath: null,
    variationIndex: index + 1, // Will be corrected by server
    roomType: 'living_room' as const,
    stagingStyle: 'modern' as const,
    operationType: 'stage_empty' as const,
    status: 'processing' as const, // Show as processing during generation
    jobId: null,
    errorMessage: null,
    processingTimeMs: null,
    createdAt: new Date(),
    completedAt: null,
    signedUrl: null, // No signed URL for optimistic variants
  }));
}

export function useGenerateImages(
  options?: UseMutationOptions<
    GenerateImagesResponse, 
    Error, 
    GenerateImagesRequest, 
    { previousImageData: unknown; sourceImageId: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['generateImages'],
    mutationFn: generateImages,
    
    onMutate: async (variables) => {
      const { sourceImageId, imageCount } = variables;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: imageKeys.detail(sourceImageId) });
      
      // Snapshot the previous value
      const previousImageData = queryClient.getQueryData(imageKeys.detail(sourceImageId));
      
      // Optimistically update the cache
      queryClient.setQueryData(
        imageKeys.detail(sourceImageId), 
        (old?: OptimisticImageData): OptimisticImageData | undefined => {
          if (!old || Array.isArray(old)) return old;
          
          const optimisticVariants = createOptimisticVariants(sourceImageId, imageCount);
          
          return {
            ...old,
            variants: [...(old.variants || []), ...optimisticVariants]
          };
        }
      );
      
      // Also update any list queries that might include this image
      queryClient.setQueriesData(
        { queryKey: ['images', 'list'], exact: false },
        (old?: OptimisticImageData): OptimisticImageData | undefined => {
          if (!old || !Array.isArray(old)) return old;
          
          return old.map((image: SourceImage) => {
            if (image.id === sourceImageId) {
              const optimisticVariants = createOptimisticVariants(sourceImageId, imageCount);
              return {
                ...image,
                variants: [...(image.variants || []), ...optimisticVariants]
              };
            }
            return image;
          });
        }
      );
      
      // Also update project detail queries
      queryClient.setQueriesData(
        { queryKey: ['projects'], exact: false },
        (old?: { images: SourceImage[] }): { images: SourceImage[] } | undefined => {
          if (!old?.images || !Array.isArray(old.images)) return old;
          
          return {
            ...old,
            images: old.images.map((image: SourceImage) => {
              if (image.id === sourceImageId) {
                const optimisticVariants = createOptimisticVariants(sourceImageId, imageCount);
                return {
                  ...image,
                  variants: [...(image.variants || []), ...optimisticVariants]
                };
              }
              return image;
            })
          };
        }
      );
      
      // Show immediate feedback
      toast.success(`Generating ${imageCount} variant${imageCount !== 1 ? 's' : ''}...`);
      
      return { previousImageData, sourceImageId };
    },
    
    onError: (error: Error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousImageData) {
        queryClient.setQueryData(
          imageKeys.detail(context.sourceImageId), 
          context.previousImageData
        );
      }
      
      // Also rollback list queries
      queryClient.invalidateQueries({
        queryKey: ['images', 'list'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false
      });
      
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate images');
    },
    
    onSuccess: (data, variables) => {
      const { sourceImageId } = variables;
      
      // Update the cache with real data from server
      queryClient.setQueryData(
        imageKeys.detail(sourceImageId), 
        (old?: SourceImage): SourceImage | undefined => {
          if (!old) return old;
          
          // Replace optimistic variants with real ones
          const realVariants = data.data.generations;
          const nonOptimisticVariants = (old.variants || []).filter(
            (variant: VariantSummary) => !variant.id.startsWith('optimistic-')
          );
          
          return {
            ...old,
            variants: [...nonOptimisticVariants, ...realVariants]
          };
        }
      );
      
      // Success feedback
      const count = data.data.generations.length;
      toast.success(`Successfully generated ${count} variant${count !== 1 ? 's' : ''}!`);

      // 🔥 FIX: Invalidate related queries to ensure consistency
      // Use partial matching to catch all image list queries regardless of filters
      queryClient.invalidateQueries({
        queryKey: ['images', 'list'],
        exact: false // ✅ This catches ALL image list queries!
      });
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false // ✅ This catches ALL project queries!
      });
      // Invalidate generations cache for this specific image
      queryClient.invalidateQueries({
        queryKey: ['image', sourceImageId, 'generations']
      });
    },
    
    onSettled: (_data, _error, variables) => {
      // Always refetch the specific image detail to ensure we have the latest data
      queryClient.invalidateQueries({ 
        queryKey: imageKeys.detail(variables.sourceImageId) 
      });
    },
    
    ...options,
  });
}

// Hook for checking if any images are currently generating
export function useIsGenerating() {
  const queryClient = useQueryClient();
  
  // Check if there are any pending generation mutations
  const mutationCache = queryClient.getMutationCache();
  const generationMutations = mutationCache.findAll({
    mutationKey: ['generateImages'],
    status: 'pending'
  });
  
  return generationMutations.length > 0;
}

// Hook for getting generation progress for a specific image
export function useGenerationProgress(sourceImageId: string) {
  const queryClient = useQueryClient();
  
  const imageData = queryClient.getQueryData<SourceImage>(imageKeys.detail(sourceImageId));
  const variants = imageData?.variants || [];
  
  const processingCount = variants.filter((v: VariantSummary) =>
    v.status === 'processing' || v.id.startsWith('optimistic-')
  ).length;
  
  const completedCount = variants.filter((v: VariantSummary) =>
    v.status === 'completed'
  ).length;
  
  const failedCount = variants.filter((v: VariantSummary) =>
    v.status === 'failed'
  ).length;
  
  return {
    processingCount,
    completedCount,
    failedCount,
    totalCount: variants.length,
    isGenerating: processingCount > 0
  };
}