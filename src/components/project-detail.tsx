"use client"

import { useState, forwardRef, useImperativeHandle } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Image as ImageIcon, Upload, Trash2, FolderOpen, ArrowRight, FolderPlus } from "lucide-react"
import { SourceImageCard } from "@/components/source-image-card"
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog"
import { useSimpleDeleteImage } from "@/lib/shared/hooks/use-delete-image"
import { useImageList, useImageMetadata, useRenameImage, useProjectList } from "@/lib/shared/hooks/use-images"
import { useImageSelection } from "@/lib/shared/hooks/use-row-selection"
import { UNASSIGNED_PROJECT_NAME } from "@/lib/constants/project-constants"
import { toast } from "sonner"

interface ProjectDetailProps {
  projectId: string
  onBack: () => void
  onImageSelect: ImageSelectHandler
  onUploadMore?: () => void
}

export interface ProjectDetailRef {
  refreshProject: () => Promise<void>
}

// interface Project {
//   id: string
//   name: string
//   createdAt: string
//   updatedAt: string
// }


import { SourceImage, type ImageSelectHandler } from '@/lib/shared/types/image-types'

export const ProjectDetail = forwardRef<ProjectDetailRef, ProjectDetailProps>(function ProjectDetail({ projectId, onBack, onImageSelect, onUploadMore }, ref) {
  // Use unified cache - images filtered by projectId (shares cache with AllImages and Dashboard!)
  const queryClient = useQueryClient()

  // Check both metadata and imageList loading states (fixes F5 flash)
  const metadataQuery = useImageMetadata({ projectId })
  const {
    data: sourceImages = [],
    isLoading: imagesLoading,
    refetch
  } = useImageList({ projectId })

  // Show loading if EITHER query is loading
  const loading = metadataQuery.isLoading || imagesLoading

  // Get project info from the first image (they all have the same project info)
  const project = sourceImages.length > 0 ? {
    id: sourceImages[0].projectId,
    name: sourceImages[0].projectName || 'Project',
    createdAt: sourceImages[0].createdAt || new Date().toISOString()
  } : null

  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [deleteImageName, setDeleteImageName] = useState<string>('')
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])

  // Move to project state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [targetProjectId, setTargetProjectId] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  // Bulk selection state
  const selection = useImageSelection(sourceImages)

  // Load projects for move functionality
  const {
    data: projects = [],
    isLoading: loadingProjects
  } = useProjectList()

  // Use the rename mutation hook
  const renameMutation = useRenameImage()

  // Expose refresh function via ref (now uses unified cache refetch)
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

  // Helper to check if project is unassigned or current project
  const isUnassignedProject = (projectName: string) => projectName === UNASSIGNED_PROJECT_NAME

  // Filter available projects for move functionality (exclude current project and unassigned)
  const availableProjects = projects.filter(p =>
    p.id !== projectId && !isUnassignedProject(p.name)
  )

  // Move selected images to another project
  const handleMoveSelected = () => {
    if (selection.selectedIds.length > 0) {
      setMoveDialogOpen(true)
    }
  }

  const handleConfirmMove = async () => {
    if (!targetProjectId || selection.selectedIds.length === 0) {
      toast.error('Please select a project')
      return
    }

    setIsMoving(true)
    try {
      const response = await fetch('/api/images/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: selection.selectedIds,
          targetProjectId: targetProjectId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setMoveDialogOpen(false)
        setTargetProjectId('')
        selection.clearSelection()

        // Invalidate image and project caches (only refetches active queries by default)
        await queryClient.invalidateQueries({
          queryKey: ['images'],
          exact: false
        })
        await queryClient.invalidateQueries({
          queryKey: ['projects'],
          exact: false
        })
      } else {
        toast.error(data.message || 'Failed to move images')
      }
    } catch (error) {
      console.error('Error moving images:', error)
      toast.error('Failed to move images')
    } finally {
      setIsMoving(false)
    }
  }

  const handleCreateAndMove = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    setIsCreatingProject(true)
    try {
      // Create new project
      const createResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      })

      const createData = await createResponse.json()

      if (!createData.success) {
        toast.error(createData.message || 'Failed to create project')
        return
      }

      const newProjectId = createData.project.id

      // Move images to new project
      const moveResponse = await fetch('/api/images/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: selection.selectedIds,
          targetProjectId: newProjectId
        })
      })

      const moveData = await moveResponse.json()

      if (moveData.success) {
        toast.success(`Created "${newProjectName}" and moved ${selection.selectedIds.length} images`)
        setMoveDialogOpen(false)
        setTargetProjectId('')
        setNewProjectName('')
        selection.clearSelection()

        // Invalidate image and project caches (only refetches active queries by default)
        await queryClient.invalidateQueries({
          queryKey: ['images'],
          exact: false
        })
        await queryClient.invalidateQueries({
          queryKey: ['projects'],
          exact: false
        })
      } else {
        toast.error(moveData.message || 'Failed to move images to new project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    } finally {
      setIsCreatingProject(false)
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

  if (!loading && sourceImages.length === 0) {
    // If not loading and no images, try to get project info from API
    // For now, show a generic project header since we don't have project metadata
    // In the future, we could add a separate useProject hook if needed
  }

  if (!loading && sourceImages.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Project</h1>
              <p className="text-muted-foreground">No images yet</p>
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
            <h1 className="text-3xl font-bold text-foreground">{project?.name || 'Project'}</h1>
            <p className="text-muted-foreground">
              {sourceImages.length} {sourceImages.length === 1 ? 'image' : 'images'}
              {project?.createdAt && ` • Created ${formatDate(new Date(project.createdAt))}`}
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
                size="sm"
                onClick={handleMoveSelected}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                disabled={isMoving}
              >
                <FolderOpen className="h-4 w-4" />
                Move to Project
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

      {/* Move to Project Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Move {selection.selectedIds.length} {selection.selectedIds.length === 1 ? 'Image' : 'Images'} to Project
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-project">Select Project</Label>
              <Select
                value={targetProjectId}
                onValueChange={setTargetProjectId}
                disabled={loadingProjects || isMoving}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Choose a project"} />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <span>{project.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({project.sourceImageCount} images)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or create new project
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-project-name">New Project Name</Label>
              <div className="flex gap-2">
                <Input
                  id="new-project-name"
                  placeholder="Enter project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  disabled={isCreatingProject || isMoving}
                />
                <Button
                  onClick={handleCreateAndMove}
                  disabled={!newProjectName.trim() || isCreatingProject || isMoving}
                  className="gap-2 shrink-0"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create & Move
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveDialogOpen(false)
                setTargetProjectId('')
                setNewProjectName('')
              }}
              disabled={isMoving || isCreatingProject}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMove}
              disabled={!targetProjectId || isMoving || isCreatingProject}
              className="gap-2"
            >
              {isMoving ? (
                <>Moving...</>
              ) : (
                <>
                  Move Images
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})