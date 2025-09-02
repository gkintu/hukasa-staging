import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { 
  AuditListQuery, 
  AuditListResponse,
  AuditStatsResponse,
  ApiResponse 
} from './audit-schemas';

// Query key factory for audit-related queries
export const auditKeys = {
  all: ['admin', 'audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: AuditListQuery) => [...auditKeys.lists(), filters] as const,
  stats: () => [...auditKeys.all, 'stats'] as const,
  stat: (params: Record<string, unknown>) => [...auditKeys.stats(), params] as const,
} as const;

// API functions
async function fetchAuditLogs(query: AuditListQuery): Promise<AuditListResponse['data']> {
  const params = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (value instanceof Date) {
        params.append(key, value.toISOString());
      } else {
        params.append(key, String(value));
      }
    }
  });

  const response = await fetch(`/api/admin/audit?${params}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: ApiResponse<AuditListResponse['data']> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch audit logs');
  }
  
  return result.data!;
}

async function fetchAuditStats(params?: {
  startDate?: Date;
  endDate?: Date;
  days?: number;
}): Promise<AuditStatsResponse['data']> {
  const searchParams = new URLSearchParams();
  
  if (params?.startDate) {
    searchParams.append('startDate', params.startDate.toISOString());
  }
  if (params?.endDate) {
    searchParams.append('endDate', params.endDate.toISOString());
  }
  if (params?.days) {
    searchParams.append('days', String(params.days));
  }

  const response = await fetch(`/api/admin/audit/stats?${searchParams}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result: ApiResponse<AuditStatsResponse['data']> = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch audit statistics');
  }
  
  return result.data!;
}

// Hooks
export function useAuditLogs(query: AuditListQuery) {
  return useQuery({
    queryKey: auditKeys.list(query),
    queryFn: () => fetchAuditLogs(query),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAuditStats(params?: {
  startDate?: Date;
  endDate?: Date;  
  days?: number;
}) {
  return useQuery({
    queryKey: auditKeys.stat(params || {}),
    queryFn: () => fetchAuditStats(params),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Utility hooks
export function useAuditQueryClient() {
  const queryClient = useQueryClient();
  
  return {
    // Invalidate all audit queries
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: auditKeys.all }),
    
    // Invalidate audit list queries
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: auditKeys.lists() }),
    
    // Invalidate stats queries
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: auditKeys.stats() }),
    
    // Prefetch audit logs
    prefetchLogs: (query: AuditListQuery) => {
      return queryClient.prefetchQuery({
        queryKey: auditKeys.list(query),
        queryFn: () => fetchAuditLogs(query),
        staleTime: 30 * 1000,
      });
    },
    
    // Get cached audit data
    getLogData: (query: AuditListQuery) => {
      return queryClient.getQueryData<AuditListResponse['data']>(auditKeys.list(query));
    },
    
    // Get cached stats data
    getStatsData: (params?: Record<string, unknown>) => {
      return queryClient.getQueryData<AuditStatsResponse['data']>(auditKeys.stat(params || {}));
    },
  };
}