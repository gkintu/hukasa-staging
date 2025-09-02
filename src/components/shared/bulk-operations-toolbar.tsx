'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Trash2, 
  Download, 
  Move, 
  MoreHorizontal, 
  X, 
  AlertCircle, 
  RefreshCw,
  Archive,
  Copy,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgressTracker, type ProgressItem } from './progress-tracker'
import { BaseModal } from './base-modal'
import { toast } from '@/lib/shared/hooks/use-toast'

export interface BulkAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  requiresConfirmation?: boolean
  requiresInput?: {
    type: 'select' | 'text'
    placeholder: string
    options?: { value: string; label: string }[]
  }
  disabled?: (selectedIds: string[]) => boolean
}

interface BulkOperationsToolbarProps {
  selectedItems: string[]
  totalItems: number
  onSelectAll: () => void
  onClearSelection: () => void
  actions: BulkAction[]
  onActionExecute: (actionId: string, itemIds: string[], extra?: { input?: string }) => Promise<void>
  context?: 'main' | 'admin'
  className?: string
  isExecuting?: boolean
  // Optional: For displaying items info
  itemTypeSingular?: string // e.g., "image"
  itemTypePlural?: string // e.g., "images"
}

interface BulkOperationProgress {
  actionId: string
  actionLabel: string
  total: number
  completed: number
  failed: number
  items: ProgressItem[]
  isComplete: boolean
  error?: string
}

export function BulkOperationsToolbar({
  selectedItems,
  totalItems,
  onSelectAll,
  onClearSelection,
  actions,
  onActionExecute,
  context = 'main',
  className,
  isExecuting = false,
  itemTypeSingular = 'item',
  itemTypePlural = 'items'
}: BulkOperationsToolbarProps) {
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [showProgress, setShowProgress] = useState(false)
  const [operationProgress, setOperationProgress] = useState<BulkOperationProgress | null>(null)

  const isAllSelected = selectedItems.length === totalItems && totalItems > 0

  const executeAction = useCallback(async (actionId: string, itemIds: string[], extra?: { input?: string }) => {
    const action = actions.find(a => a.id === actionId)
    if (!action) return

    try {
      // Initialize progress tracking
      setOperationProgress({
        actionId,
        actionLabel: action.label,
        total: itemIds.length,
        completed: 0,
        failed: 0,
        items: itemIds.map(id => ({
          id,
          title: `${itemTypeSingular} ${id}`,
          status: 'pending',
          progress: 0
        })),
        isComplete: false
      })
      setShowProgress(true)

      // Simulate progress updates (in real app this would come from WebSocket/EventSource)
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => {
          if (!prev || prev.isComplete) return prev
          
          const pendingItems = prev.items.filter(item => item.status === 'pending')
          if (pendingItems.length === 0) return prev

          const itemToUpdate = pendingItems[0]
          const newItems = prev.items.map(item => {
            if (item.id === itemToUpdate.id) {
              return {
                ...item,
                status: Math.random() > 0.1 ? 'completed' as const : 'error' as const,
                progress: 100,
                error: Math.random() > 0.1 ? undefined : 'Operation failed'
              }
            }
            return item
          })

          const completed = newItems.filter(item => item.status === 'completed').length
          const failed = newItems.filter(item => item.status === 'error').length
          const isComplete = completed + failed === newItems.length

          return {
            ...prev,
            items: newItems,
            completed,
            failed,
            isComplete
          }
        })
      }, 500)

      // Execute the actual operation
      await onActionExecute(actionId, itemIds, extra)
      
      clearInterval(progressInterval)

      // Mark operation as complete
      setOperationProgress(prev => prev ? { ...prev, isComplete: true } : null)
      
      toast.success(`${action.label} completed for ${itemIds.length} ${itemIds.length === 1 ? itemTypeSingular : itemTypePlural}`)
      
      // Clear selection after successful operation
      onClearSelection()
      
    } catch (error) {
      console.error(`Bulk operation failed:`, error)
      toast.error(`Failed to ${action.label.toLowerCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Update progress to show error
      setOperationProgress(prev => prev ? {
        ...prev,
        isComplete: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      } : null)
    }
  }, [actions, itemTypeSingular, itemTypePlural, onActionExecute, onClearSelection])

  const handleActionClick = useCallback((action: BulkAction) => {
    if (action.disabled?.(selectedItems)) return
    
    if (action.requiresInput) {
      setActiveAction(action)
      setInputValue('')
    } else if (action.requiresConfirmation) {
      // Show confirmation modal
      setActiveAction(action)
    } else {
      executeAction(action.id, selectedItems)
    }
  }, [selectedItems, executeAction])

  const handleConfirmAction = useCallback(() => {
    if (!activeAction) return
    
    const extra = activeAction.requiresInput ? { input: inputValue } : undefined
    executeAction(activeAction.id, selectedItems, extra)
    setActiveAction(null)
    setInputValue('')
  }, [activeAction, selectedItems, inputValue, executeAction])

  const handleCancelAction = useCallback(() => {
    setActiveAction(null)
    setInputValue('')
  }, [])

  // Don't render if no items selected
  if (selectedItems.length === 0) {
    return null
  }

  const availableActions = actions.filter(action => !action.disabled?.(selectedItems))

  return (
    <>
      <div className={cn(
        "flex items-center justify-between p-4 bg-muted/50 rounded-lg border",
        context === 'admin' && 'border-admin-border',
        className
      )}>
        {/* Selection Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="font-medium">
              {selectedItems.length} selected
            </Badge>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                of {totalItems} {totalItems === 1 ? itemTypeSingular : itemTypePlural}
              </span>
            )}
          </div>
          
          <Separator orientation="vertical" className="h-4" />
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={isExecuting}
              className={cn(
                "text-xs",
                context === 'admin' && 'border-admin-border'
              )}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            
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
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Actions (first 3) */}
          {availableActions.slice(0, 3).map((action) => (
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
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
            </Button>
          ))}

          {/* More Actions Dropdown */}
          {availableActions.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isExecuting}
                  className={cn(
                    context === 'admin' && 'border-admin-border'
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableActions.slice(3).map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className="flex items-center space-x-2"
                  >
                    <action.icon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Action Input Modal */}
      {activeAction?.requiresInput && (
        <BaseModal
          isOpen={true}
          onClose={handleCancelAction}
          title={`${activeAction.label} ${selectedItems.length} ${selectedItems.length === 1 ? itemTypeSingular : itemTypePlural}`}
          context={context}
          size="md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action-input">
                {activeAction.requiresInput.placeholder}
              </Label>
              
              {activeAction.requiresInput.type === 'select' ? (
                <Select value={inputValue} onValueChange={setInputValue}>
                  <SelectTrigger 
                    id="action-input"
                    className={context === 'admin' ? 'border-admin-border' : ''}
                  >
                    <SelectValue placeholder={activeAction.requiresInput.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAction.requiresInput.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="action-input"
                  type="text"
                  placeholder={activeAction.requiresInput.placeholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className={context === 'admin' ? 'border-admin-border' : ''}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancelAction}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction}
              disabled={!inputValue.trim()}
              variant={activeAction.variant === 'destructive' ? 'destructive' : 'default'}
            >
              <activeAction.icon className="h-4 w-4 mr-2" />
              {activeAction.label}
            </Button>
          </div>
        </BaseModal>
      )}

      {/* Confirmation Modal */}
      {activeAction?.requiresConfirmation && !activeAction.requiresInput && (
        <BaseModal
          isOpen={true}
          onClose={handleCancelAction}
          title={`Confirm ${activeAction.label}`}
          context={context}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm">
                  Are you sure you want to {activeAction.label.toLowerCase()} {selectedItems.length} selected {selectedItems.length === 1 ? itemTypeSingular : itemTypePlural}?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancelAction}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction}
              variant={activeAction.variant === 'destructive' ? 'destructive' : 'default'}
            >
              <activeAction.icon className="h-4 w-4 mr-2" />
              {activeAction.label}
            </Button>
          </div>
        </BaseModal>
      )}

      {/* Progress Modal */}
      {showProgress && operationProgress && (
        <BaseModal
          isOpen={true}
          onClose={() => operationProgress.isComplete ? setShowProgress(false) : undefined}
          title={operationProgress.actionLabel}
          context={context}
          size="lg"
        >
          <ProgressTracker
            items={operationProgress.items}
            title={`${operationProgress.actionLabel} Progress`}
            context={context}
          />

          {operationProgress.isComplete && (
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowProgress(false)}>
                Close
              </Button>
            </div>
          )}
        </BaseModal>
      )}
    </>
  )
}

// Predefined bulk actions
export const CommonBulkActions = {
  delete: {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive' as const,
    requiresConfirmation: true,
  },
  
  move: {
    id: 'move',
    label: 'Move to Project',
    icon: Move,
    variant: 'outline' as const,
    requiresInput: {
      type: 'select' as const,
      placeholder: 'Select destination project',
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
  },

  copy: {
    id: 'copy',
    label: 'Duplicate',
    icon: Copy,
    variant: 'outline' as const,
  },

  reprocess: {
    id: 'reprocess',
    label: 'Reprocess',
    icon: RefreshCw,
    variant: 'outline' as const,
  },

  view: {
    id: 'view',
    label: 'View Details',
    icon: Eye,
    variant: 'outline' as const,
    disabled: (selectedIds: string[]) => selectedIds.length !== 1 // Only enabled for single selection
  }
}