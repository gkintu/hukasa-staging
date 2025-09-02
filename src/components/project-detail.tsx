"use client"

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, Image as ImageIcon, Upload, Trash2 } from "lucide-react"
import { SourceImageCard } from "@/components/source-image-card"
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog"
import { useSimpleDeleteImage } from "@/lib/shared/hooks/use-delete-image"
import { useProjectDetail, useRenameImage } from "@/lib/shared/hooks/use-images"
import { useImageSelection } from "@/lib/shared/hooks/use-row-selection"

interface ProjectDetailProps {
  projectId: string
  onBack: () => void
  onImageSelect: (imageId: string, sourceImage: SourceImage) => void
  onUploadMore?: () => void
}

export interface ProjectDetailRef {
  refreshProject: () => Promise<void>
}

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface SourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

export const ProjectDetail = forwardRef<ProjectDetailRef, ProjectDetailProps>(function ProjectDetail({ projectId, onBack, onImageSelect, onUploadMore }, ref) {
  // TanStack Query state (replacing manual useState)
  const { 
    data, 
    isLoading: loading, 
    refetch 
  } = useProjectDetail(projectId)
  
  const project = data?.project || null
  const sourceImages = data?.images || []

  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [deleteImageName, setDeleteImageName] = useState<string>('')
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  
  // Bulk selection state
  const selection = useImageSelection(sourceImages)

  // Use the rename mutation hook
  const renameMutation = useRenameImage()

  // Expose refresh function via ref (now uses TanStack Query refetch)
  useImperativeHandle(ref, () => ({
    refreshProject: async () => {
      await refetch()
    }
  }))

  // Use the unified delete hook (TanStack Query handles cache updates)
  const { deleteImage, isLoading: isDeleting } = useSimpleDeleteImage({
    onSuccess: () => {
      // TanStack Query will automatically refetch and update the cache
      setDeleteImageId(null)
      setDeleteImageName('')
    },
    onError: (error) => {
      console.error('Delete image error:', error)
    }
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleImageClick = (sourceImage: SourceImage) => {
    onImageSelect(sourceImage.id, sourceImage)
  }

  // Handle image deletion - now uses dialog instead of confirm
  const handleImageDelete = (imageId: string) => {
    const image = sourceImages.find(img => img.id === imageId)
    setDeleteImageId(imageId)
    setDeleteImageName(image?.displayName || image?.originalFileName || 'Unknown Image')
  }

  const handleConfirmDelete = (options: { reason?: string }) => {
    if (deleteImageId) {
      deleteImage(deleteImageId, options.reason)
    }
  }

  // Bulk delete handlers
  const handleBulkDelete = () => {
    if (selection.selectedIds.length > 0) {
      setBulkDeleteIds(selection.selectedIds)
    }
  }

  const handleConfirmBulkDelete = (options: { reason?: string }) => {
    if (bulkDeleteIds.length > 0) {
      let completedCount = 0
      const totalCount = bulkDeleteIds.length
      
      bulkDeleteIds.forEach(imageId => {
        deleteImage(imageId, options.reason)
        completedCount++
        
        // Clear selection and modal when all deletions are done
        if (completedCount === totalCount) {
          setTimeout(() => {
            selection.clearSelection()
            setBulkDeleteIds([])
          }, 100) // Small delay to ensure all mutations complete
        }
      })
    }
  }

  // Handle image renaming using TanStack Query
  const handleImageRename = async (imageId: string, newDisplayName: string) => {
    try {
      await renameMutation.mutateAsync({ id: imageId, newDisplayName })
      // TanStack Query automatically updates cache and refetches
    } catch (error) {
      console.error('Error renaming image:', error)
      throw error // Re-throw so the component can handle the error
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="aspect-video bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-3">Project not found</h3>
          <p className="text-muted-foreground">This project may have been deleted or you don&apos;t have access to it.</p>
        </div>
      </div>
    )
  }

  if (sourceImages.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              <p className="text-muted-foreground">Created {formatDate(new Date(project.createdAt))}</p>
            </div>
          </div>
          <Button 
            onClick={onUploadMore}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
        </div>

        <div className="text-center py-16">
          <ImageIcon className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold mb-3">No images in this project</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Upload some images to get started with AI virtual staging for this project.
          </p>
          <Button 
            onClick={onUploadMore}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Your First Images
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground">
              {sourceImages.length} {sourceImages.length === 1 ? 'image' : 'images'} • 
              Created {formatDate(new Date(project.createdAt))}
            </p>
          </div>
        </div>
        <Button 
          onClick={onUploadMore}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload More
        </Button>
      </div>

      {/* Bulk Selection Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selection.isAllSelected}
              ref={undefined}
              onCheckedChange={selection.selectAll}
              className="rounded-sm"
            />
            <span className="text-sm text-muted-foreground">
              {selection.selectedIds.length > 0 ? (
                `${selection.selectedIds.length} selected`
              ) : (
                'Select all'
              )}
            </span>
          </div>
          
          {selection.selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selection.clearSelection}
              >
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selection.selectedIds.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sourceImages.map((sourceImage, index) => (
          <SourceImageCard
            key={sourceImage.id}
            image={sourceImage}
            variant="default"
            onClick={handleImageClick}
            onRename={handleImageRename}
            onDelete={handleImageDelete}
            index={index}
            selectable={true}
            selected={selection.getRowProps(sourceImage.id).checked}
            onSelectionChange={selection.getRowProps(sourceImage.id).onCheckedChange}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deleteImageId}
        onClose={() => {
          setDeleteImageId(null)
          setDeleteImageName('')
        }}
        onConfirm={handleConfirmDelete}
        context="main"
        title="Delete Image"
        itemName={deleteImageName}
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={bulkDeleteIds.length > 0}
        onClose={() => setBulkDeleteIds([])}
        onConfirm={handleConfirmBulkDelete}
        context="main"
        title="Delete Images"
        description={`Are you sure you want to delete ${bulkDeleteIds.length} ${bulkDeleteIds.length === 1 ? 'image' : 'images'}? This action cannot be undone.`}
        itemName={`${bulkDeleteIds.length} ${bulkDeleteIds.length === 1 ? 'image' : 'images'}`}
        isLoading={isDeleting}
      />
    </div>
  )
})