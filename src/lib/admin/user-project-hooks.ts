import { useQuery } from '@tanstack/react-query';
import type { 
  UserProjectListQuery, 
  UserProjectListResponse,
  ProjectDetail
} from './user-project-schemas';

/**
 * Hook to fetch users with project statistics for admin panel
 */
export function useUserProjectList(query: UserProjectListQuery) {
  return useQuery({
    queryKey: ['admin', 'users-projects', query],
    queryFn: async (): Promise<UserProjectListResponse> => {
      const searchParams = new URLSearchParams();
      
      // Add query parameters
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });

      const response = await fetch(`/api/admin/users-projects?${searchParams}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch users with projects');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch projects for a specific user
 */
export function useUserProjects(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'user-projects', userId],
    queryFn: async (): Promise<{
      user: { id: string; name: string | null; email: string; image: string | null };
      projects: ProjectDetail[];
    }> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`/api/admin/users-projects/${userId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch user projects');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}