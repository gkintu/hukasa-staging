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
    staleTime: 1000 * 30, // 30 seconds for real-time updates
    refetchInterval: 1000 * 60, // Background refetch every minute
    refetchIntervalInBackground: true, // Keep refetching even when tab not focused
    refetchOnWindowFocus: true, // Always refetch when user returns to tab
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
    staleTime: 1000 * 60 * 10, // 10 minutes (same as admin)
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 30, // 30 seconds for real-time updates
    refetchInterval: 1000 * 90, // Background refetch every 90 seconds  
    refetchIntervalInBackground: true, // Keep refetching in background
    refetchOnWindowFocus: true, // Always refetch when user returns to tab
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
      
      // Invalidate image queries (same pattern as admin)
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.all() });
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.lists() });
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.detail(variables.id) });
      
      // Also invalidate project queries since images belong to projects
      queryClient.invalidateQueries({ queryKey: invalidateProjectQueries.all() });
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
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.all() });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.lists() });
    },
    invalidateImage: (id: string) => {
      queryClient.invalidateQueries({ queryKey: invalidateImageQueries.detail(id) });
    },
    refetchLists: () => {
      queryClient.refetchQueries({ queryKey: invalidateImageQueries.lists() });
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

