import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProjectListQuery } from './project-schemas';

// Types for the store
interface ProjectFiltersState {
  activeFilters: Partial<ProjectListQuery>;
  searchQuery: string;
}

interface ProjectViewState {
  sortBy: ProjectListQuery['sortBy'];
  sortOrder: ProjectListQuery['sortOrder'];
  pagination: {
    page: number;
    limit: number;
  };
}

// Combined store interface
interface AdminProjectStore {
  // Filters state
  filters: ProjectFiltersState;
  
  // View state
  view: ProjectViewState;
  
  // Filter actions
  setFilter: <K extends keyof ProjectListQuery>(key: K, value: ProjectListQuery[K]) => void;
  clearFilter: (key: keyof ProjectListQuery) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  
  // View actions
  setSorting: (sortBy: ProjectListQuery['sortBy'], sortOrder?: ProjectListQuery['sortOrder']) => void;
  setPagination: (page: number, limit?: number) => void;
  resetView: () => void;
}

// Default state values
const defaultFilters: ProjectFiltersState = {
  activeFilters: {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  searchQuery: '',
};

const defaultView: ProjectViewState = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  pagination: {
    page: 1,
    limit: 20,
  },
};

// Create the store with persistence
export const useAdminProjectStore = create<AdminProjectStore>()(
  persist(
    (set, get) => ({
      // Initial state
      filters: defaultFilters,
      view: defaultView,

      // Filter actions
      setFilter: (key, value) => {
        const { filters } = get();
        set({
          filters: {
            ...filters,
            activeFilters: {
              ...filters.activeFilters,
              [key]: value,
            },
          },
        });
      },

      clearFilter: (key) => {
        const { filters } = get();
        const newFilters = { ...filters.activeFilters };
        delete newFilters[key];
        
        set({
          filters: {
            ...filters,
            activeFilters: newFilters,
          },
        });
      },

      resetFilters: () => {
        set({
          filters: {
            ...get().filters,
            activeFilters: defaultFilters.activeFilters,
            searchQuery: '',
          },
        });
      },

      setSearchQuery: (query: string) => {
        const { filters } = get();
        set({
          filters: {
            ...filters,
            searchQuery: query,
            activeFilters: {
              ...filters.activeFilters,
              search: query || undefined,
              page: 1, // Reset to first page on search
            },
          },
        });
      },

      // View actions
      setSorting: (sortBy, sortOrder = 'desc') => {
        const { view, filters } = get();
        
        set({
          view: {
            ...view,
            sortBy,
            sortOrder,
          },
          filters: {
            ...filters,
            activeFilters: {
              ...filters.activeFilters,
              sortBy,
              sortOrder,
              page: 1, // Reset to first page on sort change
            },
          },
        });
      },

      setPagination: (page, limit) => {
        const { view, filters } = get();
        
        set({
          view: {
            ...view,
            pagination: {
              page,
              limit: limit || view.pagination.limit,
            },
          },
          filters: {
            ...filters,
            activeFilters: {
              ...filters.activeFilters,
              page,
              limit: limit || filters.activeFilters.limit,
            },
          },
        });
      },

      resetView: () => {
        set({
          view: defaultView,
        });
      },
    }),
    {
      name: 'admin-project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain parts of the state
        view: {
          pagination: {
            limit: state.view.pagination.limit,
          },
        },
        filters: {
          activeFilters: {
            limit: state.filters.activeFilters.limit,
          },
        },
      }),
    }
  )
);

// Utility hooks for common operations
export const useProjectFilters = () => {
  const store = useAdminProjectStore();
  return {
    activeFilters: store.filters.activeFilters,
    searchQuery: store.filters.searchQuery,
    setFilter: store.setFilter,
    clearFilter: store.clearFilter,
    resetFilters: store.resetFilters,
    setSearchQuery: store.setSearchQuery,
  };
};

export const useProjectView = () => {
  const store = useAdminProjectStore();
  return {
    sortBy: store.view.sortBy,
    sortOrder: store.view.sortOrder,
    pagination: store.view.pagination,
    setSorting: store.setSorting,
    setPagination: store.setPagination,
    resetView: store.resetView,
  };
};