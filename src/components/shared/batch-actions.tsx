'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Trash2, 
  Move, 
  Download, 
  Archive, 
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BatchAction {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline'
  requiresConfirmation?: boolean
  requiresInput?: {
    type: 'select'
    placeholder: string
    options: { value: string; label: string }[]
  }
}

interface BatchActionsProps {
  selectedItems: string[]
  onSelectAll: (selected: boolean) => void
  onClearSelection: () => void
  totalItems: number
  actions: BatchAction[]
  onActionExecute: (actionId: string, itemIds: string[], extra?: { input?: string }) => void
  isExecuting?: boolean
  className?: string
  context?: 'main' | 'admin'
}

export function BatchActions({
  selectedItems,
  onSelectAll,
  onClearSelection,
  totalItems,
  actions,
  onActionExecute,
  isExecuting = false,
  className,
  context = 'main'
}: BatchActionsProps) {
  const [activeAction, setActiveAction] = useState<BatchAction | null>(null)
  const [inputValue, setInputValue] = useState<string>('')

  const isAllSelected = selectedItems.length === totalItems && totalItems > 0
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < totalItems

  const handleSelectAll = (checked: boolean) => {
    onSelectAll(checked)
  }

  const handleActionClick = (action: BatchAction) => {
    if (action.requiresInput) {
      setActiveAction(action)
      setInputValue('')
    } else {
      onActionExecute(action.id, selectedItems)
    }
  }

  const handleActionConfirm = () => {
    if (activeAction) {
      const extra = activeAction.requiresInput ? { input: inputValue } : undefined
      onActionExecute(activeAction.id, selectedItems, extra)
      setActiveAction(null)
      setInputValue('')
    }
  }

  const handleActionCancel = () => {
    setActiveAction(null)
    setInputValue('')
  }

  if (selectedItems.length === 0) {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={handleSelectAll}
          className={context === 'admin' ? 'border-admin-border' : ''}
        />
        <span className="text-sm text-muted-foreground">
          Select items for batch actions
        </span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Selection Header */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center space-x-3">
          <Checkbox
            checked={isAllSelected}
            ref={(ref) => {
              if (ref && 'indeterminate' in ref) {
                (ref as HTMLInputElement).indeterminate = isPartiallySelected
              }
            }}
            onCheckedChange={handleSelectAll}
            className={context === 'admin' ? 'border-admin-border' : ''}
          />
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium">
              {selectedItems.length} selected
            </Badge>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                of {totalItems} items
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isExecuting}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Action Input (when active) */}
      {activeAction?.requiresInput && (
        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
          <div className="flex items-center space-x-2">
            {activeAction.icon && <activeAction.icon className="h-4 w-4" />}
            <span className="font-medium text-sm">{activeAction.label}</span>
          </div>
          
          {activeAction.requiresInput.type === 'select' && (
            <div className="flex items-center space-x-2">
              <Select value={inputValue} onValueChange={setInputValue}>
                <SelectTrigger className={cn(
                  "flex-1",
                  context === 'admin' && 'border-admin-border'
                )}>
                  <SelectValue placeholder={activeAction.requiresInput.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {activeAction.requiresInput.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                onClick={handleActionConfirm}
                disabled={!inputValue || isExecuting}
              >
                <Check className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleActionCancel}
                disabled={isExecuting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Batch Actions */}
      {!activeAction && (
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={isExecuting}
              className={cn(
                "flex items-center space-x-1",
                context === 'admin' && 'border-admin-border'
              )}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

// Predefined common batch actions
export const CommonBatchActions = {
  delete: {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive' as const,
    requiresConfirmation: true,
  },
  
  move: {
    id: 'move',
    label: 'Move to',
    icon: Move,
    variant: 'outline' as const,
    requiresInput: {
      type: 'select' as const,
      placeholder: 'Select destination',
      options: [] // Should be populated by parent component
    }
  },
  
  download: {
    id: 'download',
    label: 'Download',
    icon: Download,
    variant: 'outline' as const,
  },
  
  archive: {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    variant: 'outline' as const,
  }
}