"use client"

import * as React from "react"
import { Search, X, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useSearch } from "@/hooks/use-search"

interface SearchCommandProps {
  className?: string
  variant?: 'admin' | 'main'
}

export function SearchCommand({ className, variant = 'main' }: SearchCommandProps) {
  const { 
    query, 
    setQuery, 
    results, 
    isLoading, 
    filters, 
    setFilters, 
    clearSearch,
    isOpen,
    setIsOpen,
    handleResultSelect,
    placeholder
  } = useSearch()

  const inputRef = React.useRef<HTMLInputElement>(null)
  const [showFilters, setShowFilters] = React.useState(false)

  const typeOptions = variant === 'admin' 
    ? ['user', 'image', 'audit', 'project']
    : ['project', 'image']

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type]
    setFilters({ types: newTypes })
  }

  const handleClear = () => {
    clearSearch()
    setShowFilters(false)
    inputRef.current?.focus()
  }

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <div className={className}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-64 pl-8 pr-20"
        />
        
        {/* Filter and Clear buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Filter className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Filter by type</h4>
                  {typeOptions.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={filters.types.includes(type)}
                        onCheckedChange={() => handleTypeToggle(type)}
                      />
                      <label
                        htmlFor={type}
                        className="text-sm capitalize cursor-pointer"
                      >
                        {type}s
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query || results.length > 0) && (
        <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          
          {!isLoading && results.length === 0 && query && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          )}
          
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.slice(0, 8).map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent cursor-pointer group"
                  onClick={() => handleResultSelect(result)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {result.title}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {result.type}
                      </Badge>
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {results.length > 8 && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-t">
                  Showing 8 of {results.length} results
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active filters display */}
      {filters.types.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {filters.types.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => handleTypeToggle(type)}
            >
              {type}s
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}