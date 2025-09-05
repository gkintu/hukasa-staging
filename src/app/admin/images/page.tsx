"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Search, Images, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog"
import type { AdvancedDelete } from "@/lib/shared/schemas/delete-schemas"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useImageList, useDeleteImage } from "@/lib/admin/image-hooks"
import { useImageFilters } from "@/lib/admin/image-store"
import { AdminImagesTable } from "@/components/admin/admin-images-table"
import { toast } from "sonner"
import type { SortingState, ColumnFiltersState, PaginationState } from "@tanstack/react-table"
import type { ImageListQuery } from "@/lib/admin/image-schemas"

export default function AdminImagesPage() {
  const queryClient = useQueryClient()
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [viewImage, setViewImage] = useState<{
    id: string
    originalImagePath: string
    originalFileName: string
    projectName: string
    roomType: string | null
    stagingStyle: string | null
    overallStatus: string
    createdAt: Date | string
    user: {
      name: string | null
      email: string
    }
  } | null>(null)
  
  // Use our new stores and hooks for basic filtering
  const { 
    searchQuery, 
    setSearchQuery, 
  } = useImageFilters()

  // TanStack Table state - controlled externally for server-side operations
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true } // Default sort by creation date
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })

  // Build query from table state
  const buildQuery = (): ImageListQuery => {
    const query: ImageListQuery = {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      sortBy: (sorting[0]?.id as 'createdAt' | 'updatedAt' | 'originalFileName' | 'userName' | 'projectName' | 'status') || 'createdAt',
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc'
    }

    // Add global search
    if (searchQuery?.trim()) {
      query.search = searchQuery.trim()
    }

    // Add column filters
    columnFilters.forEach(filter => {
      if (filter.value) {
        // Handle specific filter types
        if (filter.id === 'status') {
          query.status = filter.value as 'pending' | 'processing' | 'completed' | 'failed'
        } else if (filter.id === 'user') {
          query.userId = filter.value as string
        } else if (filter.id === 'project') {
          query.projectId = filter.value as string
        }
      }
    })

    return query
  }

  // Fetch real image data with table state
  const { 
    data: imageData, 
    isLoading, 
    error,
    refetch 
  } = useImageList(buildQuery())

  // Delete mutation
  const deleteMutation = useDeleteImage({
    onSuccess: () => {
      toast.success('Image deleted successfully')
      setDeleteImageId(null)
      refetch()
      // Invalidate main app queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['images'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete image: ${error.message}`)
    }
  })

  // Update search with debouncing - reset to first page when searching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery])


  // Get images from API response
  const images = imageData?.images || []
  const totalCount = imageData?.pagination?.total || 0


  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Management</h1>
          <p className="text-muted-foreground">
            Monitor and moderate user-generated images
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search images, users, projects..."
              className="w-80 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            All Images {isLoading ? '(Loading...)' : `(${totalCount})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 p-4 bg-red-50 rounded-md mb-4">
              Error loading images: {error.message}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          )}
          
          <AdminImagesTable
            data={images}
            isLoading={isLoading}
            pagination={pagination}
            sorting={sorting}
            columnFilters={columnFilters}
            onPaginationChange={(updater) => {
              const newPagination = typeof updater === 'function' ? updater(pagination) : updater
              setPagination(newPagination)
            }}
            onSortingChange={(updater) => {
              const newSorting = typeof updater === 'function' ? updater(sorting) : updater
              setSorting(newSorting)
            }}
            onColumnFiltersChange={(updater) => {
              const newColumnFilters = typeof updater === 'function' ? updater(columnFilters) : updater
              setColumnFilters(newColumnFilters)
            }}
            onDeleteImage={setDeleteImageId}
            onViewImage={setViewImage}
            totalCount={totalCount}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deleteImageId}
        onClose={() => setDeleteImageId(null)}
        onConfirm={(options) => {
          if (deleteImageId) {
            // Admin context always returns AdvancedDelete options from dialog
            // Use the exact options returned by the dialog (respects user's checkbox selections)
            deleteMutation.mutate({ 
              id: deleteImageId, 
              options: options as AdvancedDelete 
            })
          }
        }}
        context="admin"
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone and will remove the image from both the database and storage."
        itemName="this image"
        isLoading={deleteMutation.isPending}
      />

      {/* Image View Dialog */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw]">
          <DialogHeader>
            <DialogTitle>{viewImage?.originalFileName}</DialogTitle>
          </DialogHeader>
          {viewImage && (
            <div className="flex flex-col gap-6">
              <div className="w-full max-h-[70vh] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={`/api/files/${viewImage.originalImagePath.split('/').pop()?.split('.')[0]}`}
                  alt={viewImage.originalFileName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Project:</strong> {viewImage.projectName}
                </div>
                <div>
                  <strong>User:</strong> {viewImage.user.name || viewImage.user.email}
                </div>
                <div>
                  <strong>Room Type:</strong> {viewImage.roomType ? viewImage.roomType.replace('_', ' ') : 'No room type'}
                </div>
                <div>
                  <strong>Staging Style:</strong> {viewImage.stagingStyle || 'No staging style'}
                </div>
                <div>
                  <strong>Status:</strong> {viewImage.overallStatus}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(viewImage.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}