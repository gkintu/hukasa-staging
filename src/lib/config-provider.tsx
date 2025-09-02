"use client"

import * as React from "react"

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  layoutVariant: 'inset' | 'floating' | 'sidebar'
  collapsibleMode: 'icon' | 'offcanvas' | 'none'
  searchHistory: string[]
  defaultSearchFilters: {
    types: string[]
  }
}

interface ConfigContextType {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
  resetPreferences: () => void
  saveToStorage: () => void
  loadFromStorage: () => void
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  sidebarOpen: true,
  layoutVariant: 'inset',
  collapsibleMode: 'icon',
  searchHistory: [],
  defaultSearchFilters: {
    types: []
  }
}

const ConfigContext = React.createContext<ConfigContextType | null>(null)

interface ConfigProviderProps {
  children: React.ReactNode
  storageKey?: string
}

export function ConfigProvider({ 
  children, 
  storageKey = "hukasa-config" 
}: ConfigProviderProps) {
  const [preferences, setPreferences] = React.useState<UserPreferences>(defaultPreferences)

  // Load from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferences(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error)
    }
  }, [storageKey])

  // Save to localStorage whenever preferences change
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save user preferences:', error)
    }
  }, [preferences, storageKey])

  const updatePreferences = React.useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }, [])

  const resetPreferences = React.useCallback(() => {
    setPreferences(defaultPreferences)
  }, [])

  const saveToStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save preferences to storage:', error)
    }
  }, [preferences, storageKey])

  const loadFromStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferences(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.warn('Failed to load preferences from storage:', error)
    }
  }, [storageKey])

  // Add search term to history
  // Unused function kept for future implementation
  // const addToSearchHistory = React.useCallback((term: string) => {
  //   if (!term.trim()) return

  //   setPreferences(prev => ({
  //     ...prev,
  //     searchHistory: [
  //       term,
  //       ...prev.searchHistory.filter(t => t !== term)
  //     ].slice(0, 10) // Keep only last 10 searches
  //   }))
  // }, [])

  const contextValue: ConfigContextType = {
    preferences,
    updatePreferences,
    resetPreferences,
    saveToStorage,
    loadFromStorage
  }

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const context = React.useContext(ConfigContext)
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider")
  }
  return context
}

// Custom hook for managing user preferences
export function useUserPreferences() {
  const { preferences, updatePreferences } = useConfig()

  const setSidebarOpen = React.useCallback((open: boolean) => {
    updatePreferences({ sidebarOpen: open })
  }, [updatePreferences])

  const setLayoutVariant = React.useCallback((variant: UserPreferences['layoutVariant']) => {
    updatePreferences({ layoutVariant: variant })
  }, [updatePreferences])

  const setCollapsibleMode = React.useCallback((mode: UserPreferences['collapsibleMode']) => {
    updatePreferences({ collapsibleMode: mode })
  }, [updatePreferences])

  return {
    preferences,
    setSidebarOpen,
    setLayoutVariant,
    setCollapsibleMode,
    updatePreferences
  }
}