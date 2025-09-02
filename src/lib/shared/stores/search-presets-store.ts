import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

interface SearchFilters {
  query: string
  searchFields: string[]
  status?: string
  roomType?: string
  stagingStyle?: string
  projectId?: string
  userId?: string
  dateRange?: { start: Date; end: Date }
  fileSize?: { min?: number; max?: number }
  sortBy: string
  sortOrder: string
}

export interface SearchPreset {
  id: string
  name: string
  filters: SearchFilters
  context: 'main' | 'admin'
  createdAt: Date
  lastUsed?: Date
}

interface SearchPresetsState {
  presets: SearchPreset[]
  savePreset: (preset: Omit<SearchPreset, 'id' | 'createdAt'>) => void
  updatePreset: (id: string, updates: Partial<SearchPreset>) => void
  deletePreset: (id: string) => void
  usePreset: (id: string) => void
  getPresetsByContext: (context: 'main' | 'admin') => SearchPreset[]
  clearPresets: (context?: 'main' | 'admin') => void
}

export const useSearchPresets = create<SearchPresetsState>()(
  persist(
    (set, get) => ({
      presets: [],

      savePreset: (preset) => {
        const newPreset: SearchPreset = {
          ...preset,
          id: nanoid(),
          createdAt: new Date(),
        }
        
        set((state) => ({
          presets: [...state.presets, newPreset]
        }))
      },

      updatePreset: (id, updates) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id ? { ...preset, ...updates } : preset
          )
        }))
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id)
        }))
      },

      usePreset: (id) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id ? { ...preset, lastUsed: new Date() } : preset
          )
        }))
      },

      getPresetsByContext: (context) => {
        return get().presets.filter((preset) => preset.context === context)
      },

      clearPresets: (context) => {
        if (context) {
          set((state) => ({
            presets: state.presets.filter((preset) => preset.context !== context)
          }))
        } else {
          set({ presets: [] })
        }
      },
    }),
    {
      name: 'search-presets-storage',
      // Transform dates when persisting/hydrating
      partialize: (state) => ({
        presets: state.presets.map(preset => ({
          ...preset,
          createdAt: preset.createdAt.toISOString(),
          lastUsed: preset.lastUsed?.toISOString(),
          dateRange: preset.filters.dateRange ? {
            start: preset.filters.dateRange.start.toISOString(),
            end: preset.filters.dateRange.end.toISOString()
          } : undefined
        }))
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert ISO strings back to Date objects
          state.presets = state.presets.map(preset => ({
            ...preset,
            createdAt: new Date(preset.createdAt as unknown as string),
            lastUsed: preset.lastUsed ? new Date(preset.lastUsed as unknown as string) : undefined,
            filters: {
              ...preset.filters,
              dateRange: preset.filters.dateRange ? {
                start: new Date((preset.filters.dateRange as unknown as {start: string; end: string}).start),
                end: new Date((preset.filters.dateRange as unknown as {start: string; end: string}).end)
              } : undefined
            }
          }))
        }
      }
    }
  )
)

// Predefined quick search presets
export const createQuickPresets = (context: 'main' | 'admin'): Omit<SearchPreset, 'id' | 'createdAt'>[] => [
  {
    name: 'Recent Uploads',
    context,
    filters: {
      query: '',
      searchFields: ['originalFileName', 'displayName', 'projectName'],
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date()
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  },
  {
    name: 'Completed Staging',
    context,
    filters: {
      query: '',
      searchFields: ['originalFileName', 'displayName', 'projectName'],
      status: 'completed',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  },
  {
    name: 'Failed Processing',
    context,
    filters: {
      query: '',
      searchFields: ['originalFileName', 'displayName', 'projectName'],
      status: 'failed',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  },
  {
    name: 'Large Files',
    context,
    filters: {
      query: '',
      searchFields: ['originalFileName', 'displayName', 'projectName'],
      fileSize: { min: 10 }, // 10MB+
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  },
  {
    name: 'Living Room Modern',
    context,
    filters: {
      query: '',
      searchFields: ['originalFileName', 'displayName', 'projectName'],
      roomType: 'living_room',
      stagingStyle: 'modern',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  }
]

// Hook to initialize default presets
export const useInitializePresets = () => {
  const { presets, savePreset } = useSearchPresets()

  const initializeDefaults = (context: 'main' | 'admin') => {
    const existingPresets = presets.filter(p => p.context === context)
    if (existingPresets.length === 0) {
      // Add default presets for this context
      createQuickPresets(context).forEach(preset => {
        savePreset(preset)
      })
    }
  }

  return { initializeDefaults }
}