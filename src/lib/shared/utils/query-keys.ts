/**
 * Unified query key factory for both admin and main app
 * Uses the same working pattern as admin but supports both contexts
 */

// Main App Images (simple pattern)
export const imageKeys = {
  all: ['images'] as const,
  lists: () => [...imageKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...imageKeys.lists(), filters] as const,
  details: () => [...imageKeys.all, 'detail'] as const,
  detail: (id: string) => [...imageKeys.details(), id] as const,
}

// Admin Images (existing pattern from admin)
export const adminImageKeys = {
  all: ['admin', 'images'] as const,
  lists: () => [...adminImageKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...adminImageKeys.lists(), filters] as const,
  details: () => [...adminImageKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminImageKeys.details(), id] as const,
  stats: () => [...adminImageKeys.all, 'stats'] as const,
}

// Project keys (for main app)
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Helper functions for common operations
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
}