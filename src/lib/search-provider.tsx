"use client"

import * as React from "react"
import Fuse from 'fuse.js'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: 'user' | 'project' | 'image' | 'audit'
  url: string
  metadata?: Record<string, unknown>
}

interface SearchContextType {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  filters: {
    types: string[]
    dateRange?: { start: Date; end: Date }
  }
  setFilters: (filters: Partial<SearchContextType['filters']>) => void
  clearSearch: () => void
}

const SearchContext = React.createContext<SearchContextType | null>(null)

interface SearchProviderProps {
  children: React.ReactNode
  searchableData?: SearchResult[]
}

export function SearchProvider({ children, searchableData = [] }: SearchProviderProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [filters, setFiltersState] = React.useState({
    types: [] as string[],
    dateRange: undefined as { start: Date; end: Date } | undefined
  })

  // Debounced query state
  const [debouncedQuery, setDebouncedQuery] = React.useState("")

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Fuse.js configuration for fuzzy search
  const fuseOptions = React.useMemo(() => ({
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'subtitle', weight: 0.3 },
      { name: 'type', weight: 0.2 }
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2
  }), [])

  const fuse = React.useMemo(() => {
    return new Fuse(searchableData, fuseOptions)
  }, [searchableData, fuseOptions])

  // Perform search when debounced query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Simulate API delay for realistic UX
    const searchTimer = setTimeout(() => {
      let searchResults = fuse.search(debouncedQuery).map(result => result.item)

      // Apply filters
      if (filters.types.length > 0) {
        searchResults = searchResults.filter(result => 
          filters.types.includes(result.type)
        )
      }

      // Apply date range filter if provided
      if (filters.dateRange && searchResults.length > 0) {
        // This would be implemented based on metadata timestamp
        searchResults = searchResults.filter(result => {
          const resultDate = result.metadata?.createdAt
          if (!resultDate) return true
          const date = new Date(resultDate as string | number | Date)
          return date >= filters.dateRange!.start && date <= filters.dateRange!.end
        })
      }

      setResults(searchResults)
      setIsLoading(false)
    }, 150)

    return () => clearTimeout(searchTimer)
  }, [debouncedQuery, filters, fuse])

  const setFilters = React.useCallback((newFilters: Partial<SearchContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearSearch = React.useCallback(() => {
    setQuery("")
    setResults([])
    setFiltersState({
      types: [],
      dateRange: undefined
    })
  }, [])

  const contextValue: SearchContextType = {
    query,
    setQuery,
    results,
    isLoading,
    filters,
    setFilters,
    clearSearch
  }

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = React.useContext(SearchContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}