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

// Advanced search interfaces
export interface AdvancedSearchFilters {
  query: string
  searchFields: ('originalFileName' | 'displayName' | 'projectName' | 'userName')[]
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  roomType?: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'dining_room'
  stagingStyle?: 'modern' | 'luxury' | 'traditional' | 'scandinavian' | 'industrial' | 'bohemian'
  projectId?: string
  userId?: string
  dateRange?: { start: Date; end: Date }
  fileSize?: { min?: number; max?: number }
  sortBy: 'createdAt' | 'updatedAt' | 'originalFileName' | 'userName' | 'projectName' | 'status'
  sortOrder: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AdvancedSearchResponse {
  images: BasicImage[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

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

// Import React hooks for advanced search state management
import { useState, useCallback } from 'react';

// Advanced Search Functions
async function performAdvancedSearch(
  filters: AdvancedSearchFilters,
  context: 'main' | 'admin' = 'main'
): Promise<AdvancedSearchResponse> {
  const endpoint = context === 'admin' 
    ? '/api/admin/images/search'
    : '/api/images/search';

  const searchParams = new URLSearchParams();
  
  // Build search parameters
  if (filters.query.trim()) searchParams.append('query', filters.query);
  
  filters.searchFields.forEach(field => {
    searchParams.append('searchFields', field);
  });

  if (filters.status) searchParams.append('status', filters.status);
  if (filters.roomType) searchParams.append('roomType', filters.roomType);
  if (filters.stagingStyle) searchParams.append('stagingStyle', filters.stagingStyle);
  if (filters.projectId) searchParams.append('projectId', filters.projectId);
  if (filters.userId) searchParams.append('userId', filters.userId);
  
  if (filters.dateRange) {
    searchParams.append('startDate', filters.dateRange.start.toISOString());
    searchParams.append('endDate', filters.dateRange.end.toISOString());
  }
  
  if (filters.fileSize?.min) searchParams.append('fileSizeMin', String(filters.fileSize.min * 1024 * 1024)); // Convert MB to bytes
  if (filters.fileSize?.max) searchParams.append('fileSizeMax', String(filters.fileSize.max * 1024 * 1024)); // Convert MB to bytes
  
  searchParams.append('sortBy', filters.sortBy);
  searchParams.append('sortOrder', filters.sortOrder);
  searchParams.append('page', String(filters.page || 1));
  searchParams.append('limit', String(filters.limit || 20));

  const response = await fetch(`${endpoint}?${searchParams.toString()}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to perform advanced search');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
}

// Advanced Search Hooks
export function useAdvancedSearch(
  filters: AdvancedSearchFilters,
  context: 'main' | 'admin' = 'main',
  options?: UseQueryOptions<AdvancedSearchResponse, Error>
) {
  return useQuery({
    queryKey: [...imageKeys.all, 'advanced-search', context, filters],
    queryFn: () => performAdvancedSearch(filters, context),
    enabled: !!filters.query.trim() || Object.keys(filters).some(key => 
      key !== 'query' && key !== 'searchFields' && key !== 'sortBy' && key !== 'sortOrder' && 
      key !== 'page' && key !== 'limit' && filters[key as keyof AdvancedSearchFilters]
    ),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

// Hook for managing advanced search state with optimized performance
export function useAdvancedSearchState(context: 'main' | 'admin' = 'main') {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<AdvancedSearchFilters>({
    query: '',
    searchFields: ['originalFileName', 'displayName', 'projectName'],
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  const updateFilters = useCallback((updates: Partial<AdvancedSearchFilters>) => {
    setSearchFilters(prev => ({ 
      ...prev, 
      ...updates,
      page: updates.page || (updates.query !== undefined || Object.keys(updates).some(key => key !== 'page' && key !== 'limit') ? 1 : prev.page)
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchFilters({
      query: '',
      searchFields: ['originalFileName', 'displayName', 'projectName'],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 20
    });
  }, []);

  const searchResults = useAdvancedSearch(searchFilters, context, {
    enabled: isOpen,
    staleTime: 1000 * 60 * 2
  } as UseQueryOptions<AdvancedSearchResponse, Error>);

  return {
    isOpen,
    setIsOpen,
    searchFilters,
    updateFilters,
    clearFilters,
    searchResults,
    // Computed state
    hasActiveFilters: !!(
      searchFilters.query ||
      searchFilters.status ||
      searchFilters.roomType ||
      searchFilters.stagingStyle ||
      searchFilters.projectId ||
      searchFilters.userId ||
      searchFilters.dateRange ||
      searchFilters.fileSize?.min ||
      searchFilters.fileSize?.max
    )
  };
}