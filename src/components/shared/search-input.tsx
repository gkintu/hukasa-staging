'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  showClearButton?: boolean
  className?: string
  context?: 'main' | 'admin'
  disabled?: boolean
}

export function SearchInput({
  value = '',
  onValueChange,
  placeholder = 'Search...',
  debounceMs = 300,
  showClearButton = true,
  className,
  context = 'main',
  disabled
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value)

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Debounce the external value change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onValueChange(internalValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [internalValue, debounceMs, onValueChange, value])

  const handleClear = () => {
    setInternalValue('')
    onValueChange('')
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <Input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        disabled={disabled}
        className={cn(
          "pl-10",
          showClearButton && internalValue && "pr-10",
          context === 'admin' && 'border-admin-border'
        )}
      />
      
      {showClearButton && internalValue && (
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
  )
}