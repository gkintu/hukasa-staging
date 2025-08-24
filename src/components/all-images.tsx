"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Image as ImageIcon, Upload, Settings2, Inbox, FolderOpen, FolderPlus, ArrowRight, CheckSquare, Square } from "lucide-react"

interface AllImagesProps {
  onImageSelect: (imageId: string, sourceImage: SourceImageWithProject) => void
  onUploadClick?: () => void
  unassignedOnly?: boolean
}

interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface SourceImageWithProject {
  id: string
  projectId: string
  projectName: string
  originalImagePath: string
  originalFileName: string
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

interface Project {
  id: string
  name: string
  sourceImageCount: number
}

export function AllImages({ onImageSelect, onUploadClick, unassignedOnly = false }: AllImagesProps) {
  const [sourceImages, setSourceImages] = useState<SourceImageWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false)
  const [targetProjectId, setTargetProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [isMoving, setIsMoving] = useState(false)

  // Helper to check if project is unassigned
  const isUnassignedProject = (projectName: string) => projectName === "📥 Unassigned Images"

  useEffect(() => {
    async function fetchAllImages() {
      try {
        const response = await fetch('/api/images')
        const data = await response.json()
        
        if (data.success) {
          let images = data.sourceImages || []
          
          // Filter for unassigned images only if unassignedOnly prop is true
          if (unassignedOnly) {
            images = images.filter((img: SourceImageWithProject) => isUnassignedProject(img.projectName))
          }
          
          setSourceImages(images)
        } else {
          console.error('Failed to fetch all images:', data.message)
        }
      } catch (error) {
        console.error('Error fetching all images:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllImages()
  }, [unassignedOnly])

  // Load projects for move functionality
  const loadProjects = async () => {
    setLoadingProjects(true)
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (data.success) {
        // Filter out unassigned project from move options
        const availableProjects = data.projects.filter((p: Project) => !isUnassignedProject(p.name))
        setProjects(availableProjects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const getStatusBadge = (variants: GeneratedVariant[]) => {
    const completedCount = variants.filter(v => v.status === 'completed').length
    const processingCount = variants.filter(v => v.status === 'processing').length
    const pendingCount = variants.filter(v => v.status === 'pending').length
    const failedCount = variants.filter(v => v.status === 'failed').length

    if (failedCount > 0) {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (processingCount > 0) {
      return <Badge variant="secondary">Processing</Badge>
    }
    if (pendingCount > 0) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Ready to Stage</Badge>
    }
    if (completedCount > 0) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
    }
    return <Badge variant="outline">No variants</Badge>
  }

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
    loadProjects()
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
        // Refresh the images list
        const response = await fetch('/api/images')
        const data = await response.json()
        if (data.success) {
          let images = data.sourceImages || []
          if (unassignedOnly) {
            images = images.filter((img: SourceImageWithProject) => isUnassignedProject(img.projectName))
          }
          setSourceImages(images)
        }
        
        setSelectedImages(new Set())
        setMoveDialogOpen(false)
        setTargetProjectId('')
        
        // Show success message (you could add a toast here)
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleImageClick = (sourceImage: SourceImageWithProject) => {
    onImageSelect(sourceImage.id, sourceImage)
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              {unassignedOnly ? (
                <>
                  <Inbox className="h-8 w-8 text-muted-foreground" />
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
                  <Inbox className="h-8 w-8 text-muted-foreground" />
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
                <Inbox className="h-8 w-8 text-muted-foreground" />
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
          <Card
            key={sourceImage.id}
            className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in ${
              unassignedOnly && selectedImages.has(sourceImage.id) 
                ? 'ring-2 ring-primary border-primary' 
                : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={(e) => {
              if (unassignedOnly) {
                // In unassigned mode, clicking toggles selection
                e.preventDefault()
                toggleImageSelection(sourceImage.id)
              } else {
                // In all images mode, clicking opens modal
                handleImageClick(sourceImage)
              }
            }}
          >
            <CardContent className="p-0">
              <div className="relative">
                {/* Selection checkbox for unassigned view */}
                {unassignedOnly && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedImages.has(sourceImage.id)}
                      onCheckedChange={() => toggleImageSelection(sourceImage.id)}
                      className="bg-background/90 border-2"
                    />
                  </div>
                )}
                
                <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
                  <img
                    src={`/api/files/${sourceImage.originalImagePath.split('/').pop()?.split('.')[0]}`}
                    alt={sourceImage.originalFileName}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
                
                <div className="absolute top-2 right-2 flex gap-2">
                  {getStatusBadge(sourceImage.variants)}
                </div>

                {!unassignedOnly && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-background/90 text-foreground">
                      {sourceImage.variants.length} {sourceImage.variants.length === 1 ? 'variant' : 'variants'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg truncate flex-1 mr-2" title={sourceImage.originalFileName}>
                    {sourceImage.originalFileName}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-primary truncate" title={sourceImage.projectName}>
                    📁 {sourceImage.projectName}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center space-x-1">
                      <Settings2 className="h-3 w-3" />
                      <span className="capitalize">{sourceImage.roomType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {sourceImage.stagingStyle.charAt(0).toUpperCase() + sourceImage.stagingStyle.slice(1)} style
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {formatDate(sourceImage.createdAt)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  {projects.map((project) => (
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
    </div>
  )
}