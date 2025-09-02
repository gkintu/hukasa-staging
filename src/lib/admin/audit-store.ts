import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuditListQuery } from './audit-schemas';

// Audit filters interface
interface AuditFilters {
  search: string;
  action: string;
  adminId: string;
  targetUserId: string;
  startDate: Date | null;
  endDate: Date | null;
}

// Audit view preferences interface
interface AuditViewPreferences {
  sortBy: AuditListQuery['sortBy'];
  sortOrder: AuditListQuery['sortOrder'];
  itemsPerPage: number;
  showDetails: boolean;
  showMetadata: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
}

// Main audit store state
interface AuditStore {
  // Filters
  filters: AuditFilters;
  setFilters: (filters: Partial<AuditFilters>) => void;
  clearFilters: () => void;
  
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  
  // View preferences
  viewPreferences: AuditViewPreferences;
  setViewPreferences: (preferences: Partial<AuditViewPreferences>) => void;
  
  // Date range shortcuts
  setDateRange: (range: 'today' | '7days' | '30days' | 'custom', customStart?: Date, customEnd?: Date) => void;
  
  // Utility functions
  getQueryParams: () => AuditListQuery;
  resetToDefaults: () => void;
}

// Default values
const defaultFilters: AuditFilters = {
  search: '',
  action: '',
  adminId: '',
  targetUserId: '',
  startDate: null,
  endDate: null,
};

const defaultViewPreferences: AuditViewPreferences = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  itemsPerPage: 20,
  showDetails: false,
  showMetadata: false,
  autoRefresh: false,
  refreshInterval: 30,
};

// Create the store
export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: defaultFilters,
      currentPage: 1,
      viewPreferences: defaultViewPreferences,

      // Filter actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          currentPage: 1, // Reset to first page when filters change
        })),

      clearFilters: () =>
        set({
          filters: defaultFilters,
          currentPage: 1,
        }),

      // Pagination actions
      setCurrentPage: (page) => set({ currentPage: page }),

      // View preference actions
      setViewPreferences: (newPreferences) =>
        set((state) => ({
          viewPreferences: { ...state.viewPreferences, ...newPreferences },
        })),

      // Date range shortcuts
      setDateRange: (range, customStart, customEnd) => {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        switch (range) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
          case 'custom':
            startDate = customStart || null;
            endDate = customEnd || null;
            break;
        }

        set((state) => ({
          filters: {
            ...state.filters,
            startDate,
            endDate,
          },
          currentPage: 1,
        }));
      },

      // Utility functions
      getQueryParams: () => {
        const state = get();
        const { filters, currentPage, viewPreferences } = state;
        
        return {
          // Filters
          search: filters.search || undefined,
          action: (filters.action as AuditListQuery['action']) || undefined,
          adminId: filters.adminId || undefined,
          targetUserId: filters.targetUserId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          
          // Pagination
          page: currentPage,
          limit: viewPreferences.itemsPerPage,
          
          // Sorting
          sortBy: viewPreferences.sortBy,
          sortOrder: viewPreferences.sortOrder,
        };
      },

      resetToDefaults: () =>
        set({
          filters: defaultFilters,
          currentPage: 1,
          viewPreferences: defaultViewPreferences,
        }),
    }),
    {
      name: 'admin-audit-store', // localStorage key
      partialize: (state) => ({
        // Only persist view preferences and some filter state
        viewPreferences: state.viewPreferences,
        filters: {
          // Don't persist search and date filters
          action: state.filters.action,
          adminId: state.filters.adminId,
          targetUserId: state.filters.targetUserId,
          search: '',
          startDate: null,
          endDate: null,
        },
      }),
    }
  )
);

// Convenience hooks for common operations
export const useAuditFilters = () => {
  const filters = useAuditStore((state) => state.filters);
  const setFilters = useAuditStore((state) => state.setFilters);
  const clearFilters = useAuditStore((state) => state.clearFilters);
  
  return { filters, setFilters, clearFilters };
};

export const useAuditPagination = () => {
  const currentPage = useAuditStore((state) => state.currentPage);
  const setCurrentPage = useAuditStore((state) => state.setCurrentPage);
  const itemsPerPage = useAuditStore((state) => state.viewPreferences.itemsPerPage);
  
  return { currentPage, setCurrentPage, itemsPerPage };
};

export const useAuditView = () => {
  const viewPreferences = useAuditStore((state) => state.viewPreferences);
  const setViewPreferences = useAuditStore((state) => state.setViewPreferences);
  
  return { viewPreferences, setViewPreferences };
};