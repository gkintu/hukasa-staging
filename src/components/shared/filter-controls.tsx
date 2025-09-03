'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface DateRangeFilter {
  start?: Date
  end?: Date
}

export interface FilterState {
  categories?: string[]
  status?: string[]
  dateRange?: DateRangeFilter
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface FilterControlsProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableFilters: {
    categories?: FilterOption[]
    statuses?: FilterOption[]
    sortOptions?: FilterOption[]
  }
  showDateFilter?: boolean
  showSortControls?: boolean
  className?: string
  context?: 'main' | 'admin'
}

export function FilterControls({
  filters,
  onFiltersChange,
  availableFilters,
  showDateFilter = true,
  showSortControls = true,
  className,
  context = 'main'
}: FilterControlsProps) {
  const [isDateOpen, setIsDateOpen] = useState(false)

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const toggleMultiSelectFilter = (
    filterKey: 'categories' | 'status',
    value: string
  ) => {
    const currentValues = filters[filterKey] || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    updateFilter(filterKey, newValues.length > 0 ? newValues : undefined)
  }


  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.categories?.length) count++
    if (filters.status?.length) count++
    if (filters.dateRange?.start || filters.dateRange?.end) count++
    if (filters.sortBy) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Categories Filter */}
        {availableFilters.categories && (
          <div className="space-y-2">
            <Select
              onValueChange={(value) => toggleMultiSelectFilter('categories', value)}
            >
              <SelectTrigger className={cn(
                "w-[180px]",
                context === 'admin' && 'border-admin-border'
              )}>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {availableFilters.categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{category.label}</span>
                      {category.count !== undefined && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {category.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Selected Categories */}
            {filters.categories?.length && (
              <div className="flex flex-wrap gap-1">
                {filters.categories.map((category) => (
                  <Badge 
                    key={category} 
                    variant="secondary" 
                    className="text-xs flex items-center gap-1"
                  >
                    {availableFilters.categories?.find(c => c.value === category)?.label || category}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMultiSelectFilter('categories', category)}
                      className="h-3 w-3 p-0 hover:bg-transparent"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Filter */}
        {availableFilters.statuses && (
          <div className="space-y-2">
            <Select
              onValueChange={(value) => toggleMultiSelectFilter('status', value)}
            >
              <SelectTrigger className={cn(
                "w-[150px]",
                context === 'admin' && 'border-admin-border'
              )}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {availableFilters.statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{status.label}</span>
                      {status.count !== undefined && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {status.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Selected Statuses */}
            {filters.status?.length && (
              <div className="flex flex-wrap gap-1">
                {filters.status.map((status) => (
                  <Badge 
                    key={status} 
                    variant="secondary" 
                    className="text-xs flex items-center gap-1"
                  >
                    {availableFilters.statuses?.find(s => s.value === status)?.label || status}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMultiSelectFilter('status', status)}
                      className="h-3 w-3 p-0 hover:bg-transparent"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Date Range Filter */}
        {showDateFilter && (
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !filters.dateRange?.start && "text-muted-foreground",
                  context === 'admin' && 'border-admin-border'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.start ? (
                  filters.dateRange?.end ? (
                    <>
                      {format(filters.dateRange.start, "LLL dd, y")} -{" "}
                      {format(filters.dateRange.end, "LLL dd, y")}
                    </>
                  ) : (
                    format(filters.dateRange.start, "LLL dd, y")
                  )
                ) : (
                  "Date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="range"
                defaultMonth={filters.dateRange?.start}
                selected={{
                  from: filters.dateRange?.start,
                  to: filters.dateRange?.end,
                }}
                onSelect={(range: {from?: Date; to?: Date} | undefined) => {
                  updateFilter('dateRange', {
                    start: range?.from,
                    end: range?.to,
                  })
                  if (range?.from && range?.to) {
                    setIsDateOpen(false)
                  }
                }}
                numberOfMonths={2}
              />
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateFilter('dateRange', undefined)
                    setIsDateOpen(false)
                  }}
                  className="w-full"
                >
                  Clear dates
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Sort Controls */}
        {showSortControls && availableFilters.sortOptions && (
          <div className="flex items-center space-x-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value)}
            >
              <SelectTrigger className={cn(
                "w-[140px]",
                context === 'admin' && 'border-admin-border'
              )}>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {availableFilters.sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {filters.sortBy && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilter('sortOrder', 
                  filters.sortOrder === 'asc' ? 'desc' : 'asc'
                )}
                className={cn(
                  "px-3",
                  context === 'admin' && 'border-admin-border'
                )}
              >
                {filters.sortOrder === 'desc' ? '↓' : '↑'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}