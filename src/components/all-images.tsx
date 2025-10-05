"use client"

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Image as ImageIcon, Upload, FolderOutput, FolderOpen, FolderPlus, ArrowRight, CheckSquare, Square } from "lucide-react"
import { SourceImageCard } from "@/components/source-image-card"
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog"
import { useSimpleDeleteImage } from "@/lib/shared/hooks/use-delete-image"
import { useImageList, useImageMetadata, useRenameImage, useProjectList } from "@/lib/shared/hooks/use-images"
import type { MainImageListQuery } from "@/lib/shared/schemas/image-schemas"
import { SourceImage, SourceImageWithProject } from "@/lib/shared/types/image-types"
import { UNASSIGNED_PROJECT_NAME } from "@/lib/constants/project-constants"

interface AllImagesProps {
  onImageSelect: (imageId: string, sourceImage: SourceImageWithProject) => void
  onUploadClick?: () => void
  unassignedOnly?: boolean
}

export interface AllImagesRef {
  refreshImages: () => Promise<void>
}

export const AllImages = forwardRef<AllImagesRef, AllImagesProps>(function AllImages({ onImageSelect, onUploadClick, unassignedOnly = false }, ref) {
  // TanStack Query state (replacing manual useState)
  const imageQuery: MainImageListQuery = { unassignedOnly }

  // Check both metadata and imageList loading states (fixes F5 flash)
  const metadataQuery = useImageMetadata(imageQuery)
  const {
    data: sourceImages = [],
    isLoading: imagesLoading,
    refetch
  } = useImageList(imageQuery)

  // Show loading if EITHER query is loading
  const loading = metadataQuery.isLoading || imagesLoading

  const {
    data: projects = [],
    isLoading: loadingProjects
  } = useProjectList()

  // Local UI state (keep these)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false)
  const [targetProjectId, setTargetProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [isMoving, setIsMoving] = useState(false)
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [deleteImageName, setDeleteImageName] = useState<string>('')

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

  // Use the rename mutation hook
  const renameMutation = useRenameImage()

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

  // Helper to check if project is unassigned
  const isUnassignedProject = (projectName: string) => projectName === UNASSIGNED_PROJECT_NAME

  // Expose refresh function via ref (now uses TanStack Query refetch)
  useImperativeHandle(ref, () => ({
    refreshImages: async () => {
      await refetch()
    }
  }))

  // Filter available projects for move functionality (exclude unassigned)
  const availableProjects = projects.filter(p => !isUnassignedProject(p.name))


  // Selection handlers
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId)
      } else {
        newSelection.add(imageId)
      }
      return newSelection
    })
  }

  const selectAllImages = () => {
    if (selectedImages.size === sourceImages.length) {
      setSelectedImages(new Set())
    } else {
      setSelectedImages(new Set(sourceImages.map(img => img.id)))
    }
  }

  // Move functionality
  const handleMoveSelected = () => {
    if (selectedImages.size === 0) return
    setMoveDialogOpen(true)
  }

  const handleCreateNewProject = () => {
    setMoveDialogOpen(false)
    setCreateProjectDialogOpen(true)
  }

  const moveImagesToProject = async (projectId: string) => {
    if (selectedImages.size === 0) return
    
    setIsMoving(true)
    try {
      const response = await fetch('/api/images/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages),
          targetProjectId: projectId
        })
      })

      const result = await response.json()
      if (result.success) {
        // TanStack Query will automatically refetch and update
        await refetch()
        
        setSelectedImages(new Set())
        setMoveDialogOpen(false)
        setTargetProjectId('')
        
        console.log(result.message)
      } else {
        console.error('Move failed:', result.message)
      }
    } catch (error) {
      console.error('Error moving images:', error)
    } finally {
      setIsMoving(false)
    }
  }

  const createProjectAndMove = async () => {
    if (!newProjectName.trim() || selectedImages.size === 0) return
    
    setIsMoving(true)
    try {
      // First create the project
      const createResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      })

      const createResult = await createResponse.json()
      if (createResult.success) {
        // Then move images to the new project
        await moveImagesToProject(createResult.project.id)
        setCreateProjectDialogOpen(false)
        setNewProjectName('')
      } else {
        console.error('Project creation failed:', createResult.message)
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsMoving(false)
    }
  }


  const handleImageClick = (sourceImage: SourceImageWithProject | SourceImage) => {
    // Since this is only called from the detailed view, we know it's SourceImageWithProject
    onImageSelect(sourceImage.id, sourceImage as SourceImageWithProject)
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              {unassignedOnly ? (
                <>
                  <FolderOutput className="h-8 w-8 text-muted-foreground" />
                  Unassigned Images
                </>
              ) : (
                "All Images"
              )}
            </h1>
            <div className="h-4 bg-muted rounded w-48 animate-pulse mt-2"></div>
          </div>
          {!unassignedOnly && <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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

  if (sourceImages.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              {unassignedOnly ? (
                <>
                  <FolderOutput className="h-8 w-8 text-muted-foreground" />
                  Unassigned Images
                </>
              ) : (
                "All Images"
              )}
            </h1>
            <p className="text-muted-foreground">
              {unassignedOnly 
                ? "Great! All your images are organized into projects" 
                : "All your images across all projects"
              }
            </p>
          </div>
          {!unassignedOnly && (
            <Button 
              onClick={onUploadClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </Button>
          )}
        </div>

        <div className="text-center py-16">
          {unassignedOnly ? (
            <>
              <CheckSquare className="mx-auto h-20 w-20 text-green-500 mb-6" />
              <h3 className="text-xl font-semibold mb-3">All images organized!</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Excellent work! All your images have been assigned to projects. 
                New uploads will appear here for you to organize.
              </p>
            </>
          ) : (
            <>
              <ImageIcon className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
              <h3 className="text-xl font-semibold mb-3">No images found</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Upload some images to get started with AI virtual staging.
              </p>
              <Button 
                onClick={onUploadClick}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Your First Images
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {unassignedOnly ? (
              <>
                <FolderOutput className="h-8 w-8 text-muted-foreground" />
                Unassigned Images ({sourceImages.length})
              </>
            ) : (
              "All Images"
            )}
          </h1>
          <p className="text-muted-foreground">
            {unassignedOnly ? (
              selectedImages.size > 0 
                ? `${selectedImages.size} selected • Ready to organize into projects`
                : "Select images to organize them into projects"
            ) : (
              `${sourceImages.length} ${sourceImages.length === 1 ? 'image' : 'images'} across all your projects`
            )}
          </p>
        </div>
        {!unassignedOnly && (
          <Button 
            onClick={onUploadClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload More
          </Button>
        )}
      </div>

      {/* Selection Controls - only for unassigned view */}
      {unassignedOnly && sourceImages.length > 0 && (
        <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllImages}
              className="flex items-center gap-2"
            >
              {selectedImages.size === sourceImages.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedImages.size === sourceImages.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedImages.size} of {sourceImages.length} selected
            </span>
          </div>
          
          {selectedImages.size > 0 && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleMoveSelected}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                disabled={isMoving}
              >
                <FolderOpen className="h-4 w-4" />
                Move to Project
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sourceImages.map((sourceImage, index) => (
          <SourceImageCard
            key={sourceImage.id}
            image={sourceImage}
            variant={unassignedOnly ? 'selectable' : 'detailed'}
            isSelected={selectedImages.has(sourceImage.id)}
            showProjectName={true}
            showCreationDate={true}
            onSelect={unassignedOnly ? toggleImageSelection : undefined}
            onClick={unassignedOnly ? undefined : handleImageClick}
            onRename={handleImageRename}
            onDelete={handleImageDelete}
            index={index}
          />
        ))}
      </div>

      {/* Move to Project Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Move {selectedImages.size} {selectedImages.size === 1 ? 'Image' : 'Images'} to Project
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
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">or</p>
              <Button
                variant="outline"
                onClick={handleCreateNewProject}
                disabled={isMoving}
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                Create New Project
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMoveDialogOpen(false)}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => moveImagesToProject(targetProjectId)}
              disabled={isMoving || !targetProjectId}
              className="gap-2"
            >
              {isMoving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Moving...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Move Images
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Project Dialog */}
      <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Create Project & Move Images
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-project-name">Project Name</Label>
              <Input
                id="new-project-name"
                placeholder="e.g., Kitchen Renovation, Living Room Staging"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={isMoving}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {selectedImages.size} {selectedImages.size === 1 ? 'image' : 'images'} will be moved to this new project
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateProjectDialogOpen(false)}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button
              onClick={createProjectAndMove}
              disabled={isMoving || !newProjectName.trim()}
              className="gap-2"
            >
              {isMoving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  Create & Move
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  )
})