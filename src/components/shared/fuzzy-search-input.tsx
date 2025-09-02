'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearch } from '@/lib/search-provider'
import { useRouter } from 'next/navigation'

interface FuzzySearchInputProps {
  placeholder?: string
  showResults?: boolean
  maxResults?: number
  className?: string
  context?: 'main' | 'admin'
  disabled?: boolean
  onResultSelect?: (result: { id: string; title: string; subtitle?: string; type: string; url: string }) => void
}

export function FuzzySearchInput({
  placeholder = 'Search projects, images, features...',
  showResults = true,
  maxResults = 8,
  className,
  context = 'main',
  disabled,
  onResultSelect
}: FuzzySearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Use search provider - will throw if not available (intentional)
  const searchState = useSearch()

  const { query, setQuery, results, isLoading, clearSearch } = searchState

  const handleResultSelect = useCallback((result: { id: string; title: string; subtitle?: string; type: string; url: string }) => {
    setIsOpen(false)
    clearSearch()
    inputRef.current?.blur()
    
    if (onResultSelect) {
      onResultSelect(result)
    } else {
      // Default behavior: navigate to result URL
      router.push(result.url)
    }
  }, [clearSearch, onResultSelect, router])

  const handleInputChange = (value: string) => {
    setQuery(value)
    setIsOpen(value.length > 0)
    setSelectedIndex(0)
  }

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        resultsRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev < Math.min(results.length - 1, maxResults - 1) ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : Math.min(results.length - 1, maxResults - 1)
          )
          break
        case 'Enter':
          event.preventDefault()
          if (results[selectedIndex]) {
            handleResultSelect(results[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, results, selectedIndex, maxResults, handleResultSelect])

  const handleClear = () => {
    clearSearch()
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const displayResults = showResults ? results.slice(0, maxResults) : []

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          disabled={disabled}
          className={cn(
            "pl-10",
            query && "pr-10",
            context === 'admin' && 'border-admin-border'
          )}
        />
        
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && showResults && (
        <Card 
          ref={resultsRef}
          className={cn(
            "absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto",
            context === 'admin' && 'border-admin-border'
          )}
        >
          <CardContent className="p-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 animate-pulse text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              </div>
            )}

            {!isLoading && displayResults.length === 0 && query.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No results found for &quot;{query}&quot;
                </p>
              </div>
            )}

            {!isLoading && displayResults.length > 0 && (
              <div className="space-y-1">
                {displayResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                      index === selectedIndex 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">
                          {result.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-xs shrink-0"
                        >
                          {result.type}
                        </Badge>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </div>
                ))}

                {results.length > maxResults && (
                  <div className="pt-2 pb-1 px-3 text-center border-t">
                    <p className="text-xs text-muted-foreground">
                      Showing {maxResults} of {results.length} results
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}