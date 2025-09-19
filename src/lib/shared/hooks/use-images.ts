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


// Main App Image Hooks (extracted from admin pattern)

export function useImageList(
  query: MainImageListQuery = {},
  options?: UseQueryOptions<BasicImage[], Error>
) {
  return useQuery({
    queryKey: imageKeys.list(query),
    queryFn: () => fetchMainImageList(query),
    staleTime: Infinity, // Never consider data stale (only refetch on invalidation)
    refetchInterval: false, // ❌ NO automatic polling
    refetchIntervalInBackground: false, // ❌ NO background polling
    refetchOnWindowFocus: false, // ❌ NO refetch when returning to tab
    refetchOnReconnect: true, // ✅ YES - refetch when internet reconnects (good UX)
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
    staleTime: Infinity, // Never consider data stale (only refetch on invalidation)
    refetchOnWindowFocus: false, // ❌ NO refetch when returning to tab
    refetchOnReconnect: true, // ✅ YES - refetch when internet reconnects
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

// Mutation Hooks (using admin's pattern)

export function useRenameImage(
  options?: UseMutationOptions<void, Error, { id: string; newDisplayName: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newDisplayName }) => renameImage(id, newDisplayName),
    onSuccess: (data, variables) => {
      toast.success('Image renamed successfully');
      
      // Invalidate image queries with proper partial matching
      queryClient.invalidateQueries({
        queryKey: ['images'],
        exact: false
      });

      // Also invalidate project queries since images belong to projects
      queryClient.invalidateQueries({
        queryKey: ['projects'],
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

// Cache Management Utilities (extracted from admin)
export function useInvalidateImageQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: ['images'],
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

