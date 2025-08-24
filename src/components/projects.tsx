"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { FolderOpen, Plus, Image as ImageIcon, MoreHorizontal, Edit3, Trash2, Inbox } from "lucide-react"

// Helper function to check if project is unassigned (client-side only)
const isUnassignedProject = (projectName: string) => projectName === "📥 Unassigned Images"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface ProjectsProps {
  user?: User
  onProjectSelect?: (projectId: string) => void
  onUploadClick?: () => void
}

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  sourceImageCount: number
  stagedVersionCount: number
  thumbnailUrl: string | null
}

export function Projects({ onProjectSelect }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Move fetchProjects function here so it can be used in useEffect and elsewhere
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (data.success) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])


  const handleProjectClick = (projectId: string) => {
    onProjectSelect?.(projectId)
  }

  const handleCreateProject = () => {
    setCreateProjectDialogOpen(true)
  }

  const handleProjectCreated = (projectId: string) => {
    // Refresh the projects list
    fetchProjects()
    // Navigate to the newly created project
    onProjectSelect?.(projectId)
  }


  const handleRenameProject = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedProject(project)
    setNewProjectName(project.name)
    setRenameDialogOpen(true)
  }

  const handleDeleteProject = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedProject(project)
    setDeleteDialogOpen(true)
  }

  const confirmRename = async () => {
    if (!selectedProject || !newProjectName.trim()) return
    
    setIsUpdating(true)
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
        setProjects(projects.map(p => 
          p.id === selectedProject.id 
            ? { ...p, name: data.project.name, updatedAt: data.project.updatedAt }
            : p
        ))
        setRenameDialogOpen(false)
        setSelectedProject(null)
        setNewProjectName("")
      } else {
        console.error('Failed to rename project:', data.message)
      }
    } catch (error) {
      console.error('Error renaming project:', error)
    } finally {
      setIsUpdating(false)
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
        setProjects(projects.filter(p => p.id !== selectedProject.id))
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
              onClick={() => handleProjectClick(project.id)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-video overflow-hidden rounded-t-sm bg-muted">
                    {project.thumbnailUrl ? (
                      <img
                        src={`/api/files/${project.thumbnailUrl.split('/').pop()?.split('.')[0]}`}
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
                          <Inbox className="h-12 w-12 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                
                {/* Source Images and Staged Versions count - bottom left */}
                <div className="absolute bottom-2 left-2 text-foreground text-xs space-y-2">
                  <div className="bg-background/90 rounded-sm px-1.5 py-0.5">Source Images: {project.sourceImageCount}</div>
                  <div className="bg-background/90 rounded-sm px-1.5 py-0.5">Staged Versions: {project.stagedVersionCount}</div>
                </div>

                {/* 3-dots menu in top right - hide for unassigned project */}
                {!isUnassigned && (
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 bg-background/90 hover:bg-background/100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={(e) => handleRenameProject(project, e)}
                          className="cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Rename Project
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteProject(project, e)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              <div className="px-3 py-2">
                <h3 className="font-semibold text-lg truncate" title={project.name}>
                  {project.name}
                </h3>
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmRename()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRename}
              disabled={isUpdating || !newProjectName.trim()}
            >
              {isUpdating ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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