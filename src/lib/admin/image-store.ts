import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ImageListQuery, BulkOperation } from './image-schemas';

// Types for the store
interface ImageSelectionState {
  selectedImageIds: Set<string>;
  isSelectAllMode: boolean;
  lastSelectedId: string | null;
}

interface ImageFiltersState {
  activeFilters: Partial<ImageListQuery>;
  searchQuery: string;
  quickFilters: {
    showFailed: boolean;
    showProcessing: boolean;
    showRecent: boolean;
    showFavorites: boolean;
  };
}

interface ImageViewState {
  viewMode: 'grid' | 'table' | 'timeline';
  gridSize: 'small' | 'medium' | 'large';
  showVariants: boolean;
  sortBy: ImageListQuery['sortBy'];
  sortOrder: ImageListQuery['sortOrder'];
  pagination: {
    page: number;
    limit: number;
  };
}

interface BulkOperationState {
  isActive: boolean;
  selectedAction: BulkOperation['action'] | null;
  targetProjectId: string | null;
  reason: string;
  showConfirmDialog: boolean;
}

interface ModalState {
  imageDetailModal: {
    isOpen: boolean;
    imageId: string | null;
    variant: 'main' | 'variants' | 'history';
  };
  bulkDeleteModal: {
    isOpen: boolean;
    imageIds: string[];
  };
  advancedSearchModal: {
    isOpen: boolean;
  };
}

// Combined store interface
interface AdminImageStore {
  // Selection state
  selection: ImageSelectionState;
  
  // Filters state
  filters: ImageFiltersState;
  
  // View state
  view: ImageViewState;
  
  // Bulk operations state
  bulkOperation: BulkOperationState;
  
  // Modal state
  modals: ModalState;
  
  // Selection actions
  selectImage: (id: string, multiple?: boolean) => void;
  selectImages: (ids: string[]) => void;
  deselectImage: (id: string) => void;
  deselectAll: () => void;
  selectAll: (imageIds: string[]) => void;
  toggleSelectAll: (imageIds: string[]) => void;
  isImageSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  
  // Filter actions
  setFilter: <K extends keyof ImageListQuery>(key: K, value: ImageListQuery[K]) => void;
  clearFilter: (key: keyof ImageListQuery) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  toggleQuickFilter: (filter: keyof ImageFiltersState['quickFilters']) => void;
  applyQuickFilters: () => void;
  
  // View actions
  setViewMode: (mode: ImageViewState['viewMode']) => void;
  setGridSize: (size: ImageViewState['gridSize']) => void;
  toggleVariants: () => void;
  setSorting: (sortBy: ImageListQuery['sortBy'], sortOrder?: ImageListQuery['sortOrder']) => void;
  setPagination: (page: number, limit?: number) => void;
  resetView: () => void;
  
  // Bulk operation actions
  startBulkOperation: (action: BulkOperation['action']) => void;
  setBulkTarget: (projectId: string | null) => void;
  setBulkReason: (reason: string) => void;
  showBulkConfirmation: () => void;
  hideBulkConfirmation: () => void;
  cancelBulkOperation: () => void;
  completeBulkOperation: () => void;
  
  // Modal actions
  openImageDetail: (imageId: string, variant?: 'main' | 'variants' | 'history') => void;
  closeImageDetail: () => void;
  openBulkDeleteModal: (imageIds: string[]) => void;
  closeBulkDeleteModal: () => void;
  openAdvancedSearch: () => void;
  closeAdvancedSearch: () => void;
  closeAllModals: () => void;
}

// Default state values
const defaultSelection: ImageSelectionState = {
  selectedImageIds: new Set(),
  isSelectAllMode: false,
  lastSelectedId: null,
};

const defaultFilters: ImageFiltersState = {
  activeFilters: {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  searchQuery: '',
  quickFilters: {
    showFailed: false,
    showProcessing: false,
    showRecent: false,
    showFavorites: false,
  },
};

const defaultView: ImageViewState = {
  viewMode: 'grid',
  gridSize: 'medium',
  showVariants: false,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  pagination: {
    page: 1,
    limit: 20,
  },
};

const defaultBulkOperation: BulkOperationState = {
  isActive: false,
  selectedAction: null,
  targetProjectId: null,
  reason: '',
  showConfirmDialog: false,
};

const defaultModals: ModalState = {
  imageDetailModal: {
    isOpen: false,
    imageId: null,
    variant: 'main',
  },
  bulkDeleteModal: {
    isOpen: false,
    imageIds: [],
  },
  advancedSearchModal: {
    isOpen: false,
  },
};

// Create the store with persistence
export const useAdminImageStore = create<AdminImageStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selection: defaultSelection,
      filters: defaultFilters,
      view: defaultView,
      bulkOperation: defaultBulkOperation,
      modals: defaultModals,

      // Selection actions
      selectImage: (id: string, multiple = false) => {
        const { selection } = get();
        const newSelectedIds = new Set(selection.selectedImageIds);
        
        if (!multiple) {
          newSelectedIds.clear();
        }
        
        newSelectedIds.add(id);
        
        set({
          selection: {
            ...selection,
            selectedImageIds: newSelectedIds,
            lastSelectedId: id,
            isSelectAllMode: false,
          },
        });
      },

      selectImages: (ids: string[]) => {
        const { selection } = get();
        const newSelectedIds = new Set(selection.selectedImageIds);
        
        ids.forEach(id => newSelectedIds.add(id));
        
        set({
          selection: {
            ...selection,
            selectedImageIds: newSelectedIds,
            isSelectAllMode: false,
          },
        });
      },

      deselectImage: (id: string) => {
        const { selection } = get();
        const newSelectedIds = new Set(selection.selectedImageIds);
        newSelectedIds.delete(id);
        
        set({
          selection: {
            ...selection,
            selectedImageIds: newSelectedIds,
            isSelectAllMode: false,
          },
        });
      },

      deselectAll: () => {
        set({
          selection: {
            ...get().selection,
            selectedImageIds: new Set(),
            isSelectAllMode: false,
            lastSelectedId: null,
          },
        });
      },

      selectAll: (imageIds: string[]) => {
        set({
          selection: {
            ...get().selection,
            selectedImageIds: new Set(imageIds),
            isSelectAllMode: true,
          },
        });
      },

      toggleSelectAll: (imageIds: string[]) => {
        const { selection } = get();
        
        if (selection.isSelectAllMode || selection.selectedImageIds.size === imageIds.length) {
          // Deselect all
          set({
            selection: {
              ...selection,
              selectedImageIds: new Set(),
              isSelectAllMode: false,
            },
          });
        } else {
          // Select all
          set({
            selection: {
              ...selection,
              selectedImageIds: new Set(imageIds),
              isSelectAllMode: true,
            },
          });
        }
      },

      isImageSelected: (id: string) => {
        return get().selection.selectedImageIds.has(id);
      },

      getSelectedCount: () => {
        return get().selection.selectedImageIds.size;
      },

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
            quickFilters: defaultFilters.quickFilters,
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

      toggleQuickFilter: (filter) => {
        const { filters } = get();
        set({
          filters: {
            ...filters,
            quickFilters: {
              ...filters.quickFilters,
              [filter]: !filters.quickFilters[filter],
            },
          },
        });
      },

      applyQuickFilters: () => {
        const { filters } = get();
        const { quickFilters } = filters;
        const activeFilters = { ...filters.activeFilters };
        
        // Apply quick filters to active filters
        if (quickFilters.showFailed) {
          activeFilters.status = 'failed';
        } else if (quickFilters.showProcessing) {
          activeFilters.status = 'processing';
        } else {
          delete activeFilters.status;
        }
        
        if (quickFilters.showRecent) {
          activeFilters.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        } else {
          delete activeFilters.startDate;
        }
        
        set({
          filters: {
            ...filters,
            activeFilters,
          },
        });
      },

      // View actions
      setViewMode: (mode) => {
        set({
          view: {
            ...get().view,
            viewMode: mode,
          },
        });
      },

      setGridSize: (size) => {
        set({
          view: {
            ...get().view,
            gridSize: size,
          },
        });
      },

      toggleVariants: () => {
        const { view } = get();
        set({
          view: {
            ...view,
            showVariants: !view.showVariants,
          },
        });
      },

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

      // Bulk operation actions
      startBulkOperation: (action) => {
        set({
          bulkOperation: {
            ...get().bulkOperation,
            isActive: true,
            selectedAction: action,
          },
        });
      },

      setBulkTarget: (projectId) => {
        set({
          bulkOperation: {
            ...get().bulkOperation,
            targetProjectId: projectId,
          },
        });
      },

      setBulkReason: (reason) => {
        set({
          bulkOperation: {
            ...get().bulkOperation,
            reason,
          },
        });
      },

      showBulkConfirmation: () => {
        set({
          bulkOperation: {
            ...get().bulkOperation,
            showConfirmDialog: true,
          },
        });
      },

      hideBulkConfirmation: () => {
        set({
          bulkOperation: {
            ...get().bulkOperation,
            showConfirmDialog: false,
          },
        });
      },

      cancelBulkOperation: () => {
        set({
          bulkOperation: defaultBulkOperation,
        });
      },

      completeBulkOperation: () => {
        set({
          bulkOperation: defaultBulkOperation,
          selection: {
            ...get().selection,
            selectedImageIds: new Set(),
            isSelectAllMode: false,
          },
        });
      },

      // Modal actions
      openImageDetail: (imageId, variant = 'main') => {
        set({
          modals: {
            ...get().modals,
            imageDetailModal: {
              isOpen: true,
              imageId,
              variant,
            },
          },
        });
      },

      closeImageDetail: () => {
        set({
          modals: {
            ...get().modals,
            imageDetailModal: defaultModals.imageDetailModal,
          },
        });
      },

      openBulkDeleteModal: (imageIds) => {
        set({
          modals: {
            ...get().modals,
            bulkDeleteModal: {
              isOpen: true,
              imageIds,
            },
          },
        });
      },

      closeBulkDeleteModal: () => {
        set({
          modals: {
            ...get().modals,
            bulkDeleteModal: defaultModals.bulkDeleteModal,
          },
        });
      },

      openAdvancedSearch: () => {
        set({
          modals: {
            ...get().modals,
            advancedSearchModal: {
              isOpen: true,
            },
          },
        });
      },

      closeAdvancedSearch: () => {
        set({
          modals: {
            ...get().modals,
            advancedSearchModal: defaultModals.advancedSearchModal,
          },
        });
      },

      closeAllModals: () => {
        set({
          modals: defaultModals,
        });
      },
    }),
    {
      name: 'admin-image-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain parts of the state
        view: {
          viewMode: state.view.viewMode,
          gridSize: state.view.gridSize,
          showVariants: state.view.showVariants,
        },
        filters: {
          activeFilters: {
            limit: state.filters.activeFilters.limit,
          },
          quickFilters: state.filters.quickFilters,
        },
      }),
    }
  )
);

// Utility hooks for common operations
export const useImageSelection = () => {
  const store = useAdminImageStore();
  return {
    selectedImageIds: Array.from(store.selection.selectedImageIds),
    selectedCount: store.getSelectedCount(),
    isSelectAllMode: store.selection.isSelectAllMode,
    selectImage: store.selectImage,
    deselectImage: store.deselectImage,
    deselectAll: store.deselectAll,
    selectAll: store.selectAll,
    toggleSelectAll: store.toggleSelectAll,
    isImageSelected: store.isImageSelected,
  };
};

export const useImageFilters = () => {
  const store = useAdminImageStore();
  return {
    activeFilters: store.filters.activeFilters,
    searchQuery: store.filters.searchQuery,
    quickFilters: store.filters.quickFilters,
    setFilter: store.setFilter,
    clearFilter: store.clearFilter,
    resetFilters: store.resetFilters,
    setSearchQuery: store.setSearchQuery,
    toggleQuickFilter: store.toggleQuickFilter,
    applyQuickFilters: store.applyQuickFilters,
  };
};

export const useImageView = () => {
  const store = useAdminImageStore();
  return {
    viewMode: store.view.viewMode,
    gridSize: store.view.gridSize,
    showVariants: store.view.showVariants,
    sortBy: store.view.sortBy,
    sortOrder: store.view.sortOrder,
    pagination: store.view.pagination,
    setViewMode: store.setViewMode,
    setGridSize: store.setGridSize,
    toggleVariants: store.toggleVariants,
    setSorting: store.setSorting,
    setPagination: store.setPagination,
    resetView: store.resetView,
  };
};