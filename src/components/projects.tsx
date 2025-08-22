"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, Plus, Calendar, Image as ImageIcon } from "lucide-react"

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
  imageCount: number
  thumbnailUrl: string | null
}

export function Projects({ onProjectSelect, onUploadClick }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
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

    fetchProjects()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleProjectClick = (projectId: string) => {
    onProjectSelect?.(projectId)
  }

  const handleCreateProject = () => {
    onUploadClick?.()
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
        {projects.map((project, index) => (
          <Card
            key={project.id}
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleProjectClick(project.id)}
          >
            <CardContent className="p-0">
              <div className="relative">
                <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
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
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className="absolute top-2 right-2 bg-background/90 text-foreground"
                >
                  {project.imageCount} {project.imageCount === 1 ? 'image' : 'images'}
                </Badge>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 truncate" title={project.name}>
                  {project.name}
                </h3>
                <div className="flex items-center text-sm text-muted-foreground space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}