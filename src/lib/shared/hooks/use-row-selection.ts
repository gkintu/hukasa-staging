import { useState, useCallback, useMemo } from 'react'
import { RowSelectionState } from '@tanstack/react-table'

export interface SelectionActions<T = unknown> {
  // Basic selection
  selectedRows: T[]
  selectedIds: string[]
  isAllSelected: boolean
  isPartiallySelected: boolean
  
  // Selection methods
  selectAll: () => void
  clearSelection: () => void
  toggleRowSelection: (id: string) => void
  selectRows: (ids: string[]) => void
  
  // Table integration
  rowSelection: RowSelectionState
  onRowSelectionChange: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => void
  
  // Utility methods
  getRowProps: (id: string) => {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
  }
}

interface UseRowSelectionOptions<T = unknown> {
  data: T[]
  getRowId: (row: T) => string
  enabled?: boolean
}

export function useRowSelection<T = unknown>({
  data,
  getRowId,
  enabled = true
}: UseRowSelectionOptions<T>): SelectionActions<T> {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Memoized values for performance
  const { selectedRows, selectedIds, allRowIds } = useMemo(() => {
    const allIds = data.map(getRowId)
    const selectedIdSet = new Set(Object.keys(rowSelection).filter(id => rowSelection[id]))
    const selectedRowsResult = data.filter(row => selectedIdSet.has(getRowId(row)))
    
    return {
      selectedRows: selectedRowsResult,
      selectedIds: Array.from(selectedIdSet),
      allRowIds: allIds
    }
  }, [data, rowSelection, getRowId])

  const isAllSelected = useMemo(() => {
    return data.length > 0 && selectedIds.length === data.length
  }, [data.length, selectedIds.length])

  const isPartiallySelected = useMemo(() => {
    return selectedIds.length > 0 && selectedIds.length < data.length
  }, [selectedIds.length, data.length])

  // Selection methods
  const selectAll = useCallback(() => {
    if (!enabled) return
    
    if (isAllSelected) {
      setRowSelection({})
    } else {
      const newSelection: RowSelectionState = {}
      allRowIds.forEach(id => {
        newSelection[id] = true
      })
      setRowSelection(newSelection)
    }
  }, [enabled, isAllSelected, allRowIds])

  const clearSelection = useCallback(() => {
    if (!enabled) return
    setRowSelection({})
  }, [enabled])

  const toggleRowSelection = useCallback((id: string) => {
    if (!enabled) return
    
    setRowSelection(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }, [enabled])

  const selectRows = useCallback((ids: string[]) => {
    if (!enabled) return
    
    const newSelection: RowSelectionState = {}
    ids.forEach(id => {
      newSelection[id] = true
    })
    setRowSelection(newSelection)
  }, [enabled])

  // Table integration
  const onRowSelectionChange = useCallback((updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
    if (!enabled) return
    setRowSelection(updater)
  }, [enabled])

  // Utility method for individual row props
  const getRowProps = useCallback((id: string) => ({
    checked: !!rowSelection[id],
    onCheckedChange: (checked: boolean) => {
      if (!enabled) return
      
      setRowSelection(prev => ({
        ...prev,
        [id]: checked
      }))
    }
  }), [rowSelection, enabled])

  return {
    selectedRows,
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    selectAll,
    clearSelection,
    toggleRowSelection,
    selectRows,
    rowSelection,
    onRowSelectionChange,
    getRowProps
  }
}

// Hook for bulk operations with selection
export function useBulkOperations<T = unknown>(options: UseRowSelectionOptions<T>) {
  const selection = useRowSelection(options)
  const [isExecuting, setIsExecuting] = useState(false)

  const executeBulkOperation = useCallback(async (
    operationFn: (selectedItems: T[]) => Promise<void>,
    options?: { 
      clearSelectionOnSuccess?: boolean
      showProgress?: boolean 
    }
  ) => {
    if (selection.selectedRows.length === 0) return
    
    const { clearSelectionOnSuccess = true } = options || {}
    
    try {
      setIsExecuting(true)
      await operationFn(selection.selectedRows)
      
      if (clearSelectionOnSuccess) {
        selection.clearSelection()
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      throw error
    } finally {
      setIsExecuting(false)
    }
  }, [selection])

  return {
    ...selection,
    isExecuting,
    executeBulkOperation
  }
}

// Specialized hook for image selection
export function useImageSelection(images: Array<{id: string}>) {
  return useRowSelection({
    data: images,
    getRowId: (image) => image.id,
    enabled: true
  })
}

// Specialized hook for project selection  
export function useProjectSelection(projects: Array<{id: string}>) {
  return useRowSelection({
    data: projects,
    getRowId: (project) => project.id,
    enabled: true
  })
}