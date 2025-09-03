import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import { 
  ImageListQuery,
  ImageListResponse,
  ImageDetail,
  BulkOperation,
  BulkOperationResponse,
  ImageDelete,
  ImageDeleteResponse,
  ImageStatsResponse
} from './image-schemas';

import { adminImageKeys } from '@/lib/shared/utils/query-keys'

// Use shared query keys instead of duplicated factory
export const imageKeys = adminImageKeys;

// API Functions
async function fetchImageList(query: ImageListQuery): Promise<ImageListResponse['data']> {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'fileSize' && typeof value === 'object' && value !== null && !(value instanceof Date)) {
        const fileSizeObj = value as { min?: number; max?: number };
        if (fileSizeObj.min !== undefined) params.append('fileSizeMin', String(fileSizeObj.min));
        if (fileSizeObj.max !== undefined) params.append('fileSizeMax', String(fileSizeObj.max));
      } else if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, String(value));
      }
    }
  });

  const response = await fetch(`/api/admin/images?${params.toString()}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch images');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
}

async function fetchImageDetail(id: string): Promise<ImageDetail> {
  const response = await fetch(`/api/admin/images/${id}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch image details');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
}

async function fetchImageStats(params?: { startDate?: Date; endDate?: Date; days?: number }): Promise<ImageStatsResponse['data']> {
  const searchParams = new URLSearchParams();
  
  if (params?.startDate) searchParams.append('startDate', params.startDate.toISOString());
  if (params?.endDate) searchParams.append('endDate', params.endDate.toISOString());
  if (params?.days) searchParams.append('days', String(params.days));

  const response = await fetch(`/api/admin/images/stats?${searchParams.toString()}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch image statistics');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
}

async function performBulkOperation(operation: BulkOperation): Promise<BulkOperationResponse> {
  const response = await fetch('/api/admin/images/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to perform bulk operation');
  }
  
  return data;
}

async function deleteImage(id: string, options?: ImageDelete): Promise<ImageDeleteResponse> {
  const response = await fetch(`/api/admin/images/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: options ? JSON.stringify(options) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete image');
  }
  
  return data;
}


// Query Hooks
export function useImageList(
  query: ImageListQuery,
  options?: UseQueryOptions<ImageListResponse['data'], Error>
) {
  return useQuery({
    queryKey: imageKeys.list(query),
    queryFn: () => fetchImageList(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export function useImageDetail(
  id: string,
  options?: UseQueryOptions<ImageDetail, Error>
) {
  return useQuery({
    queryKey: imageKeys.detail(id),
    queryFn: () => fetchImageDetail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

export function useImageStats(
  params?: { startDate?: Date; endDate?: Date; days?: number },
  options?: UseQueryOptions<ImageStatsResponse['data'], Error>
) {
  return useQuery({
    queryKey: [...imageKeys.stats(), params],
    queryFn: () => fetchImageStats(params),
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  });
}


// Mutation Hooks
export function useBulkOperation(
  options?: UseMutationOptions<BulkOperationResponse, Error, BulkOperation>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: performBulkOperation,
    onSuccess: (data, variables) => {
      // Invalidate relevant queries based on operation type
      switch (variables.action) {
        case 'delete':
        case 'move_project':
        case 'reprocess':
          // Invalidate all image lists and stats
          queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
          queryClient.invalidateQueries({ queryKey: imageKeys.stats() });
          
          // Invalidate specific image details if we have them
          variables.imageIds.forEach(id => {
            queryClient.invalidateQueries({ queryKey: imageKeys.detail(id) });
          });
          break;
      }
    },
    ...options,
  });
}

export function useDeleteImage(
  options?: UseMutationOptions<ImageDeleteResponse, Error, { id: string; options?: ImageDelete }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options: deleteOptions }) => deleteImage(id, deleteOptions),
    onSuccess: (data, variables) => {
      // Remove the deleted image from cache
      queryClient.removeQueries({ queryKey: imageKeys.detail(variables.id) });
      
      // Invalidate image lists and stats
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: imageKeys.stats() });
    },
    ...options,
  });
}

// Cache Management Utilities
export function useInvalidateImageQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.all });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.stats() });
    },
    invalidateImage: (id: string) => {
      queryClient.invalidateQueries({ queryKey: imageKeys.detail(id) });
    },
    refetchLists: () => {
      queryClient.refetchQueries({ queryKey: imageKeys.lists() });
    },
    refetchStats: () => {
      queryClient.refetchQueries({ queryKey: imageKeys.stats() });
    },
  };
}

// Prefetch Utilities
export function usePrefetchImage() {
  const queryClient = useQueryClient();

  return {
    prefetchImage: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: imageKeys.detail(id),
        queryFn: () => fetchImageDetail(id),
        staleTime: 1000 * 60 * 10,
      });
    },
    prefetchImageList: (query: ImageListQuery) => {
      queryClient.prefetchQuery({
        queryKey: imageKeys.list(query),
        queryFn: () => fetchImageList(query),
        staleTime: 1000 * 60 * 5,
      });
    },
  };
}

// Optimistic Updates Utilities
export function useOptimisticImageUpdates() {
  const queryClient = useQueryClient();

  return {
    optimisticDelete: (imageId: string) => {
      // Remove image from all list queries
      queryClient.setQueriesData(
        { queryKey: imageKeys.lists() },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object' || !('images' in oldData)) return oldData;
          
          const data = oldData as { images: { id: string }[]; pagination: { total: number } };
          
          return {
            ...data,
            images: data.images.filter((img) => img.id !== imageId),
            pagination: {
              ...data.pagination,
              total: Math.max(0, data.pagination.total - 1)
            }
          };
        }
      );
    },
    
    optimisticBulkDelete: (imageIds: string[]) => {
      queryClient.setQueriesData(
        { queryKey: imageKeys.lists() },
        (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object' || !('images' in oldData)) return oldData;
          
          const data = oldData as { images: { id: string }[]; pagination: { total: number } };
          
          const filteredImages = data.images.filter(
            (img) => !imageIds.includes(img.id)
          );
          
          return {
            ...data,
            images: filteredImages,
            pagination: {
              ...data.pagination,
              total: Math.max(0, data.pagination.total - imageIds.length)
            }
          };
        }
      );
    }
  };
}