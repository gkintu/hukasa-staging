"use client"

import * as React from "react"
import { useSearch as useSearchContext } from "@/lib/search-provider"

interface SearchOptions {
  autoFocus?: boolean
  placeholder?: string
  onResultSelect?: (result: { url: string }) => void
}

export function useSearch(options: SearchOptions = {}) {
  const searchContext = useSearchContext()
  const [isOpen, setIsOpen] = React.useState(false)

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      
      // Escape to close search
      if (e.key === 'Escape') {
        setIsOpen(false)
        searchContext.clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchContext])

  const handleResultSelect = React.useCallback((result: { url: string }) => {
    setIsOpen(false)
    searchContext.clearSearch()
    options.onResultSelect?.(result)
  }, [options, searchContext])

  return {
    ...searchContext,
    isOpen,
    setIsOpen,
    handleResultSelect,
    placeholder: options.placeholder || "Search everything...",
    autoFocus: options.autoFocus
  }
}

// Specialized hooks for different contexts
export function useAdminSearch() {
  return useSearch({
    placeholder: "Search users, images, audit logs...",
    onResultSelect: (result) => {
      // Navigate to the result URL
      window.location.href = result.url
    }
  })
}

export function useMainAppSearch() {
  return useSearch({
    placeholder: "Search projects, images...",
    onResultSelect: (result) => {
      // Use router.push for client-side navigation
      window.location.href = result.url
    }
  })
}