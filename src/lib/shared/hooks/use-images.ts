import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import {
  fetchMainImageList,
  fetchMainImageDetail,
  fetchImageMetadata,
  refreshImageUrls,
  fetchProjectList,
  fetchProjectDetail,
  renameImage
} from '../queries/image-queries';
import {
  imageKeys,
  projectKeys,
  invalidateImageQueries,
  invalidateProjectQueries
} from '../utils/query-keys';
import { toast } from './use-toast';
import type {
  MainImageListQuery,
  BasicImage,
  BasicProject
} from '../schemas/image-schemas';

// Main App Image Hooks with separated metadata and URL management

// Separated metadata and URL hooks for optimal caching

// Hook for image metadata (cached indefinitely, only invalidated on mutations)
export function useImageMetadata(
  query: MainImageListQuery = {},
  options?: UseQueryOptions<BasicImage[], Error>
) {
  return useQuery({
    queryKey: [...imageKeys.list(query), 'metadata'],
    queryFn: () => fetchImageMetadata(query),
    staleTime: Infinity, // Never stale - only refetch on invalidation
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true, // Refetch when network reconnects
    ...options,
  });
}

// Hook for URL refresh (optimized for 1hr TTL with 30min stale time)
export function useImageUrls(
  images: BasicImage[] | undefined,
  options?: UseQueryOptions<{ images: Record<string, string>; variants: Record<string, string | null> }, Error>
) {
  return useQuery({
    queryKey: ['imageUrls', images?.map(img => img.id)],
    queryFn: () => refreshImageUrls(images!),
    enabled: !!images && images.length > 0,

    // 🚀 Optimized refresh pattern for signed URLs (1hr TTL, 30min stale)
    staleTime: 30 * 60 * 1000,       // 30 minutes (refresh before expiry)
    refetchInterval: false,          // No automatic interval polling
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,      // ✅ Refresh when user returns (manual trigger)
    refetchOnReconnect: true,        // ✅ Refetch when internet reconnects

    ...options,
  });
}

// Combined hook that merges metadata with URLs
export function useImageList(
  query: MainImageListQuery = {},
  options?: UseQueryOptions<BasicImage[], Error>
) {
  const queryClient = useQueryClient();

  // Get metadata (cached indefinitely)
  const metadataQuery = useImageMetadata(query, options);

  // Get fresh URLs (refreshed every 2 hours) - remove unused assignment
  useImageUrls(metadataQuery.data);

  return useQuery({
    queryKey: imageKeys.list(query),
    queryFn: async () => {
      const metadata = await queryClient.ensureQueryData({
        queryKey: [...imageKeys.list(query), 'metadata'],
        queryFn: () => fetchImageMetadata(query)
      });

      if (metadata.length === 0) {
        return metadata;
      }

      const urls = await queryClient.ensureQueryData({
        queryKey: ['imageUrls', metadata.map(img => img.id)],
        queryFn: () => refreshImageUrls(metadata)
      });

      // Merge URLs into metadata
      return metadata.map(image => ({
        ...image,
        signedUrl: urls.images?.[image.id] || null,
        variants: image.variants.map(variant => ({
          ...variant,
          signedUrl: urls.variants?.[variant.id] || null
        }))
      }));
    },
    enabled: metadataQuery.isSuccess,
    staleTime: 30 * 60 * 1000, // 30 minutes - refresh before 1hr URL expiry (30min safety buffer)
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options,
  });
}

export function useImageDetail(
  id: string,
  options?: UseQueryOptions<BasicImage, Error>
) {
  return useQuery({
    queryKey: imageKeys.detail(id),
    queryFn: () => fetchMainImageDetail(id),
    enabled: !!id,
    staleTime: Infinity, // Never consider data stale (only refetch on invalidation)
    refetchOnWindowFocus: false, // ❌ NO refetch when returning to tab
    refetchOnReconnect: true, // ✅ YES - refetch when internet reconnects
    ...options,
  });
}

// Project Hooks (extracted from main app pattern)

export function useProjectList(
  options?: UseQueryOptions<BasicProject[], Error>
) {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: fetchProjectList,
    staleTime: 30 * 60 * 1000, // 30 minutes (signed URLs valid for 60min)
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, // ✅ Refresh when user returns
    refetchOnReconnect: true, // ✅ Refetch when internet reconnects
    ...options,
  });
}

export function useProjectDetail(
  projectId: string,
  options?: UseQueryOptions<{ project: BasicProject; images: BasicImage[] }, Error>
) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProjectDetail(projectId),
    enabled: !!projectId,
    staleTime: Infinity, // Never consider data stale (only refetch on invalidation)
    refetchInterval: false, // ❌ NO automatic polling
    refetchIntervalInBackground: false, // ❌ NO background polling
    refetchOnWindowFocus: false, // ❌ NO refetch when returning to tab
    refetchOnReconnect: true, // ✅ YES - refetch when internet reconnects
    ...options,
  });
}

// Hook for image generations/variants (modal usage)
export function useImageGenerations(
  imageId: string,
  options?: UseQueryOptions<Array<any>, Error>
) {
  return useQuery({
    queryKey: ['image', imageId, 'generations'],
    queryFn: async () => {
      const response = await fetch(`/api/images/${imageId}/generations`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch generations')
      }

      return data.data.generations
    },
    enabled: !!imageId,
    staleTime: 30 * 60 * 1000, // 30 minutes (signed URLs valid for 60min)
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, // ✅ Refresh when user returns (signed URLs might be stale)
    refetchOnReconnect: true,
    ...options,
  });
}

// Mutation Hooks (using admin's pattern)

export function useRenameImage(
  options?: UseMutationOptions<void, Error, { id: string; newDisplayName: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newDisplayName }) => renameImage(id, newDisplayName),
    onSuccess: () => {
      toast.success('Image renamed successfully');

      // Only invalidate metadata since URLs don't change when renaming
      queryClient.invalidateQueries({
        queryKey: ['images'],
        exact: false,
        predicate: (query) => query.queryKey.includes('metadata')
      });

      // Also invalidate project queries since images belong to projects
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        exact: false
      });

      // Invalidate combined queries to pick up new metadata
      queryClient.invalidateQueries({
        queryKey: ['images', 'list'],
        exact: false
      });
    },
    onError: (error) => {
      console.error('Rename image error:', error);
      toast.error(error.message || 'Failed to rename image');
    },
    ...options,
  });
}

// Cache Management Utilities with separated metadata and URL invalidation
export function useInvalidateImageQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      // Invalidate all image-related queries
      queryClient.invalidateQueries({
        queryKey: ['images'],
        exact: false
      });
      // Also invalidate URL caches
      queryClient.invalidateQueries({
        queryKey: ['imageUrls'],
        exact: false
      });
    },
    invalidateMetadata: () => {
      // Only invalidate metadata (when data changes)
      queryClient.invalidateQueries({
        queryKey: ['images'],
        exact: false,
        predicate: (query) => query.queryKey.includes('metadata')
      });
    },
    invalidateUrls: () => {
      // Only invalidate URLs (for security refresh)
      queryClient.invalidateQueries({
        queryKey: ['imageUrls'],
        exact: false
      });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({
        queryKey: ['images', 'list'],
        exact: false
      });
    },
    invalidateImage: (id: string) => {
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.detail(id) });
    },
    refetchLists: () => {
      queryClient.refetchQueries({
        queryKey: ['images', 'list'],
        exact: false
      });
    },
  };
}

export function useInvalidateProjectQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: invalidateProjectQueries.all() });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: invalidateProjectQueries.lists() });
    },
    invalidateProject: (id: string) => {
      queryClient.invalidateQueries({ queryKey: invalidateProjectQueries.detail(id) });
    },
    refetchLists: () => {
      queryClient.refetchQueries({ queryKey: invalidateProjectQueries.lists() });
    },
  };
}

// Prefetch Utilities (extracted from admin)
export function usePrefetchImage() {
  const queryClient = useQueryClient();

  return {
    prefetchImage: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: imageKeys.detail(id),
        queryFn: () => fetchMainImageDetail(id),
        staleTime: 1000 * 60 * 10,
      });
    },
    prefetchImageList: (query: MainImageListQuery) => {
      queryClient.prefetchQuery({
        queryKey: imageKeys.list(query),
        queryFn: () => fetchMainImageList(query),
        staleTime: 1000 * 60 * 5,
      });
    },
  };
}

