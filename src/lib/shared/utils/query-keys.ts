/**
 * Unified query key factory for both admin and main app
 * Eliminates duplication between admin and main app query keys
 */

// Generic query key factory function
function createQueryKeys<T extends readonly string[]>(base: T) {
  return {
    all: base,
    lists: () => [...base, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...base, 'list', filters] as const,
    details: () => [...base, 'detail'] as const,
    detail: (id: string) => [...base, 'detail', id] as const,
    stats: () => [...base, 'stats'] as const,
  }
}

// Main App Images
export const imageKeys = createQueryKeys(['images'] as const)

// Admin Images 
export const adminImageKeys = createQueryKeys(['admin', 'images'] as const)

// Projects
export const projectKeys = createQueryKeys(['projects'] as const)

// Admin Projects (if needed in future)
export const adminProjectKeys = createQueryKeys(['admin', 'projects'] as const)

// Users (admin)
export const userKeys = createQueryKeys(['admin', 'users'] as const)

// Stats (admin)
export const statsKeys = createQueryKeys(['admin', 'stats'] as const)

// Helper functions for common invalidation operations
export const invalidateImageQueries = {
  all: () => imageKeys.all,
  lists: () => imageKeys.lists(),
  detail: (id: string) => imageKeys.detail(id),
  adminAll: () => adminImageKeys.all,
  adminLists: () => adminImageKeys.lists(),
  adminDetail: (id: string) => adminImageKeys.detail(id),
}

export const invalidateProjectQueries = {
  all: () => projectKeys.all,
  lists: () => projectKeys.lists(),
  detail: (id: string) => projectKeys.detail(id),
  adminAll: () => adminProjectKeys.all,
  adminLists: () => adminProjectKeys.lists(),
  adminDetail: (id: string) => adminProjectKeys.detail(id),
}

export const invalidateUserQueries = {
  all: () => userKeys.all,
  lists: () => userKeys.lists(),
  detail: (id: string) => userKeys.detail(id),
}

export const invalidateStatsQueries = {
  all: () => statsKeys.all,
  lists: () => statsKeys.lists(),
}