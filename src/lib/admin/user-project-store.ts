import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Zustand store for managing user project filters and search state
 */
interface UserProjectFiltersState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Reset all filters
  resetFilters: () => void;
}

export const useUserProjectFilters = create<UserProjectFiltersState>()(
  devtools(
    (set) => ({
      // Search state
      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }, false, 'setSearchQuery'),
      
      // Reset function
      resetFilters: () => set({ 
        searchQuery: '' 
      }, false, 'resetFilters'),
    }),
    {
      name: 'admin-user-project-filters-store',
    }
  )
);