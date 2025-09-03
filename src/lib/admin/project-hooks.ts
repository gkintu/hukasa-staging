import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import { 
  ProjectListQuery,
  ProjectListResponse
} from './project-schemas';
import type { AdvancedDelete } from '@/lib/shared/schemas/delete-schemas';

import { adminProjectKeys } from '@/lib/shared/utils/query-keys'

// Use shared query keys
export const projectKeys = adminProjectKeys;

// API Functions
async function fetchProjectList(query: ProjectListQuery): Promise<ProjectListResponse> {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, String(value));
      }
    }
  });

  const response = await fetch(`/api/admin/projects?${params.toString()}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch projects');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return data.data;
}

// Delete project API function
async function deleteProject(params: { id: string; options: AdvancedDelete }): Promise<void> {
  const response = await fetch(`/api/admin/projects/${params.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.options),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete project');
  }
  
  if (!data.success) {
    throw new Error(data.message);
  }
}

// Project List Hook
export function useProjectList(
  query: ProjectListQuery,
  options?: Omit<UseQueryOptions<ProjectListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => fetchProjectList(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  });
}

// Delete Project Hook
export function useDeleteProject(
  options?: UseMutationOptions<void, Error, { id: string; options: AdvancedDelete }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      // Invalidate and refetch project queries
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    ...options,
  });
}