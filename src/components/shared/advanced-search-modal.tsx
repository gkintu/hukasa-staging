'use client'

import { useState, useCallback } from 'react'
import { Calendar, Search, Save, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { BaseModal } from './base-modal'
import { DayPicker } from 'react-day-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useSearchPresets } from '@/lib/shared/stores/search-presets-store'
import 'react-day-picker/style.css'

interface AdvancedSearchFilters {
  query: string
  searchFields: ('originalFileName' | 'displayName' | 'projectName' | 'userName')[]
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  roomType?: 'living_room' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'dining_room'
  stagingStyle?: 'modern' | 'luxury' | 'traditional' | 'scandinavian' | 'industrial' | 'bohemian'
  projectId?: string
  userId?: string
  dateRange?: { start: Date; end: Date }
  fileSize?: { min?: number; max?: number }
  sortBy: 'createdAt' | 'updatedAt' | 'originalFileName' | 'userName' | 'projectName' | 'status'
  sortOrder: 'asc' | 'desc'
}

interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (filters: AdvancedSearchFilters) => void
  context?: 'main' | 'admin'
  initialFilters?: Partial<AdvancedSearchFilters>
  availableProjects?: { id: string; name: string }[]
  availableUsers?: { id: string; name: string; email: string }[]
}

const defaultFilters: AdvancedSearchFilters = {
  query: '',
  searchFields: ['originalFileName', 'displayName', 'projectName'],
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

export function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  context = 'main',
  initialFilters,
  availableProjects = [],
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    ...defaultFilters,
    ...initialFilters
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  const { presets, savePreset, deletePreset } = useSearchPresets()

  const updateFilters = useCallback((updates: Partial<AdvancedSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSearchFieldToggle = useCallback((field: AdvancedSearchFilters['searchFields'][0]) => {
    const newFields = filters.searchFields.includes(field)
      ? filters.searchFields.filter(f => f !== field)
      : [...filters.searchFields, field]
    updateFilters({ searchFields: newFields })
  }, [filters.searchFields, updateFilters])

  const handleDateRangeSelect = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      updateFilters({ dateRange: { start: range.from, end: range.to } })
      setShowDatePicker(false)
    } else if (!range?.from && !range?.to) {
      updateFilters({ dateRange: undefined })
    }
  }, [updateFilters])

  const handleSearch = useCallback(() => {
    onSearch(filters)
    onClose()
  }, [filters, onSearch, onClose])

  const handleClear = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const handleLoadPreset = useCallback((preset: typeof presets[0]) => {
    const filters = preset.filters as unknown as AdvancedSearchFilters
    setFilters({ 
      ...defaultFilters, 
      ...filters
    })
  }, [])

  const handleSavePreset = useCallback(() => {
    if (presetName.trim()) {
      savePreset({
        name: presetName.trim(),
        filters,
        context
      })
      setPresetName('')
      setShowSavePreset(false)
    }
  }, [presetName, filters, context, savePreset])

  const contextPresets = presets.filter(p => p.context === context)

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Search"
      description="Search with detailed filters and sorting options"
      size="lg"
      context={context}
    >
      <div className="space-y-6">
        {/* Search Query */}
        <div className="space-y-2">
          <Label htmlFor="search-query">Search Query</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-query"
              placeholder="Enter search terms..."
              value={filters.query}
              onChange={(e) => updateFilters({ query: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Search Fields */}
        <div className="space-y-3">
          <Label>Search In</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'originalFileName', label: 'File Name' },
              { key: 'displayName', label: 'Display Name' },
              { key: 'projectName', label: 'Project Name' },
              { key: 'userName', label: 'User Name' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={filters.searchFields.includes(key as AdvancedSearchFilters['searchFields'][0])}
                  onCheckedChange={() => handleSearchFieldToggle(key as AdvancedSearchFilters['searchFields'][0])}
                  className={context === 'admin' ? 'border-admin-border' : ''}
                />
                <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.status || ''} onValueChange={(value) => 
              updateFilters({ status: (value || undefined) as AdvancedSearchFilters['status'] })
            }>
              <SelectTrigger className={context === 'admin' ? 'border-admin-border' : ''}>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Room Type Filter */}
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={filters.roomType || ''} onValueChange={(value) => 
              updateFilters({ roomType: (value || undefined) as AdvancedSearchFilters['roomType'] })
            }>
              <SelectTrigger className={context === 'admin' ? 'border-admin-border' : ''}>
                <SelectValue placeholder="Any room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any room</SelectItem>
                <SelectItem value="living_room">Living Room</SelectItem>
                <SelectItem value="bedroom">Bedroom</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="bathroom">Bathroom</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="dining_room">Dining Room</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Staging Style Filter */}
          <div className="space-y-2">
            <Label>Staging Style</Label>
            <Select value={filters.stagingStyle || ''} onValueChange={(value) => 
              updateFilters({ stagingStyle: (value || undefined) as AdvancedSearchFilters['stagingStyle'] })
            }>
              <SelectTrigger className={context === 'admin' ? 'border-admin-border' : ''}>
                <SelectValue placeholder="Any style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any style</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="traditional">Traditional</SelectItem>
                <SelectItem value="scandinavian">Scandinavian</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="bohemian">Bohemian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Filter (if available) */}
          {availableProjects.length > 0 && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={filters.projectId || ''} onValueChange={(value) => 
                updateFilters({ projectId: value || undefined })
              }>
                <SelectTrigger className={context === 'admin' ? 'border-admin-border' : ''}>
                  <SelectValue placeholder="Any project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any project</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange && "text-muted-foreground",
                  context === 'admin' && 'border-admin-border'
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filters.dateRange ? (
                  `${format(filters.dateRange.start, 'MMM dd, yyyy')} - ${format(filters.dateRange.end, 'MMM dd, yyyy')}`
                ) : (
                  "Select date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="range"
                selected={filters.dateRange ? { 
                  from: filters.dateRange.start, 
                  to: filters.dateRange.end 
                } : undefined}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                required={false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* File Size Range */}
        <div className="space-y-2">
          <Label>File Size (MB)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="number"
                placeholder="Min size"
                value={filters.fileSize?.min || ''}
                onChange={(e) => updateFilters({ 
                  fileSize: { 
                    ...filters.fileSize, 
                    min: e.target.value ? Number(e.target.value) : undefined 
                  }
                })}
                className={context === 'admin' ? 'border-admin-border' : ''}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max size"
                value={filters.fileSize?.max || ''}
                onChange={(e) => updateFilters({ 
                  fileSize: { 
                    ...filters.fileSize, 
                    max: e.target.value ? Number(e.target.value) : undefined 
                  }
                })}
                className={context === 'admin' ? 'border-admin-border' : ''}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Sorting */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sort By</Label>
            <Select value={filters.sortBy} onValueChange={(value) => 
              updateFilters({ sortBy: value as AdvancedSearchFilters['sortBy'] })
            }>
              <SelectTrigger className={context === 'admin' ? 'border-admin-border' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="updatedAt">Updated Date</SelectItem>
                <SelectItem value="originalFileName">File Name</SelectItem>
                <SelectItem value="userName">User Name</SelectItem>
                <SelectItem value="projectName">Project Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order</Label>
            <Select value={filters.sortOrder} onValueChange={(value) => 
              updateFilters({ sortOrder: value as AdvancedSearchFilters['sortOrder'] })
            }>
              <SelectTrigger className={context === 'admin' ? 'border-admin-border' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Presets */}
        {contextPresets.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Saved Searches</Label>
              <div className="flex flex-wrap gap-2">
                {contextPresets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadPreset(preset)}
                      className={cn(
                        "text-xs h-7",
                        context === 'admin' && 'border-admin-border'
                      )}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {preset.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePreset(preset.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Save Preset Section */}
        <div className="space-y-2">
          {!showSavePreset ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavePreset(true)}
              className={cn(
                "text-xs",
                context === 'admin' && 'border-admin-border'
              )}
            >
              <Save className="h-3 w-3 mr-1" />
              Save Search
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Search name..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className={cn(
                  "text-sm h-8",
                  context === 'admin' && 'border-admin-border'
                )}
              />
              <Button size="sm" onClick={handleSavePreset} className="h-8">
                Save
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSavePreset(false)}
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleClear}>
          Clear All
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </BaseModal>
  )
}