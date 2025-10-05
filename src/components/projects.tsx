"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CardActionsMenu } from "@/components/ui/card-actions-menu"
import { RenameModal } from "@/components/ui/rename-modal"
import { Input } from "@/components/ui/input"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { FolderOpen, Plus, Image as ImageIcon, FolderOutput } from "lucide-react"
import { useProjectList, useInvalidateProjectQueries } from "@/lib/shared/hooks/use-images"
import { UNASSIGNED_PROJECT_NAME } from "@/lib/constants/project-constants"

// Helper function to check if project is unassigned (client-side only)
const isUnassignedProject = (projectName: string) => projectName === UNASSIGNED_PROJECT_NAME

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface ProjectsProps {
  user?: User
  onProjectSelect?: (projectId: string, isUnassigned?: boolean) => void
  onUploadClick?: () => void
}

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  sourceImageCount?: number
  stagedVersionCount?: number
  thumbnailSignedUrl?: string | null
}

export function Projects({ onProjectSelect }: ProjectsProps) {
  // Use TanStack Query hook for projects
  const { data: projects = [], isLoading: loading } = useProjectList()
  const invalidateProjects = useInvalidateProjectQueries()

  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Inline editing state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)


  const handleProjectClick = (project: Project) => {
    const isUnassigned = isUnassignedProject(project.name)
    onProjectSelect?.(project.id, isUnassigned)
  }

  const handleCreateProject = () => {
    setCreateProjectDialogOpen(true)
  }

  const handleProjectCreated = (projectId: string) => {
    // Refresh the projects list (TanStack Query will auto-refetch)
    invalidateProjects.invalidateAll()
    // Navigate to the newly created project
    onProjectSelect?.(projectId)
  }


  const handleRenameProject = (project: Project) => {
    setSelectedProject(project)
    setRenameDialogOpen(true)
  }

  const handleModalRename = async (newProjectName: string) => {
    if (!selectedProject) return
    
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        // Invalidate projects cache to refetch with new data
        invalidateProjects.invalidateAll()
      } else {
        throw new Error(data.message || 'Failed to rename project')
      }
    } catch (error) {
      console.error('Error renaming project:', error)
      throw error // Re-throw so RenameModal can handle it
    }
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setDeleteDialogOpen(true)
  }


  // Inline editing functions
  const startInlineEdit = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingProjectId(project.id)
    setEditValue(project.name)
  }

  const saveInlineEdit = async () => {
    if (!editingProjectId || !editValue.trim() || isSaving) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${editingProjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editValue.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        // Invalidate projects cache to refetch with new data
        invalidateProjects.invalidateAll()
        setEditingProjectId(null)
        setEditValue("")
      } else {
        throw new Error(data.message || 'Failed to rename project')
      }
    } catch (error) {
      console.error('Error renaming project:', error)
      // Reset edit value on error
      const originalProject = projects.find(p => p.id === editingProjectId)
      if (originalProject) {
        setEditValue(originalProject.name)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const cancelInlineEdit = () => {
    setEditingProjectId(null)
    setEditValue("")
  }

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit()
    } else if (e.key === 'Escape') {
      cancelInlineEdit()
    }
  }

  const confirmDelete = async () => {
    if (!selectedProject) return
    
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        // Invalidate projects cache to refetch with new data
        invalidateProjects.invalidateAll()
        setDeleteDialogOpen(false)
        setSelectedProject(null)
      } else {
        console.error('Failed to delete project:', data.message)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
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

  if (projects.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <Button 
            onClick={handleCreateProject}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        </div>
        
        <div className="text-center py-16">
          <FolderOpen className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold mb-3">No projects yet</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create your first project to start organizing your virtual staging work. 
            Each project can contain multiple images and AI variations.
          </p>
          <Button 
            onClick={handleCreateProject}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Your First Project
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            Organize and manage your virtual staging projects
          </p>
        </div>
        <Button 
          onClick={handleCreateProject}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project, index) => {
          const isUnassigned = isUnassignedProject(project.name)
          
          return (
            <Card
              key={project.id}
              className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in pt-0 ${
                isUnassigned 
                  ? 'border-2 border-dashed border-muted-foreground/30 bg-muted/30' 
                  : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleProjectClick(project)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-video overflow-hidden rounded-t-sm bg-muted">
                    {(project.sourceImageCount ?? 0) > 0 && project.thumbnailSignedUrl ? (
                      <img
                        src={project.thumbnailSignedUrl}
                        alt={`${project.name} thumbnail`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isUnassigned ? (
                          <FolderOutput className="h-12 w-12 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                
                {/* Source Images and Staged Versions count - bottom left */}
                <div className="absolute bottom-2 left-2 text-foreground text-xs space-y-2">
                  {isUnassigned ? (
                    <div className="bg-background/90 rounded-sm px-1.5 py-0.5">
                      Unorganized Images: {project.sourceImageCount ?? 0}
                    </div>
                  ) : (
                    <>
                      <div className="bg-background/90 rounded-sm px-1.5 py-0.5">Source Images: {project.sourceImageCount ?? 0}</div>
                      <div className="bg-background/90 rounded-sm px-1.5 py-0.5">Staged Versions: {project.stagedVersionCount ?? 0}</div>
                    </>
                  )}
                </div>

                {/* Actions menu in top right - hide for unassigned project */}
                {!isUnassigned && (
                  <CardActionsMenu
                    className="absolute top-2 right-2"
                    onRename={() => handleRenameProject(project)}
                    onDelete={() => handleDeleteProject(project)}
                    renameLabel="Rename Project"
                    deleteLabel="Delete Project"
                  />
                )}
              </div>

              <div className="px-3 py-2">
                {editingProjectId === project.id ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveInlineEdit}
                    onKeyDown={handleInlineKeyDown}
                    className="font-semibold text-lg -mx-2 -my-1"
                    disabled={isSaving}
                    autoFocus
                  />
                ) : (
                  <h3
                    className={`font-semibold text-lg truncate transition-colors ${
                      !isUnassigned ? 'cursor-pointer hover:text-primary' : ''
                    }`}
                    title={project.name}
                    onClick={(e) => {
                      if (!isUnassigned) {
                        startInlineEdit(project, e)
                      }
                    }}
                  >
                    {project.name}
                  </h3>
                )}
              </div>
            </CardContent>
          </Card>
          )
        })}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={createProjectDialogOpen}
        onClose={() => setCreateProjectDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={renameDialogOpen}
        onClose={() => {
          setRenameDialogOpen(false)
          setSelectedProject(null)
        }}
        onRename={handleModalRename}
        currentName={selectedProject?.name || ""}
        itemType="project"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete &quot;{selectedProject?.name}&quot;? This action cannot be undone and will permanently delete all images and AI variations in this project.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isUpdating}
            >
              {isUpdating ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}