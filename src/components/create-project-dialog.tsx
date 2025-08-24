"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderPlus } from "lucide-react"

interface CreateProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (projectId: string) => void
}

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export function CreateProjectDialog({ isOpen, onClose, onProjectCreated }: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const handleClose = () => {
    if (!isCreating) {
      setProjectName("")
      setError("")
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = projectName.trim()
    if (!trimmedName) {
      setError("Project name is required")
      return
    }

    if (trimmedName.length > 100) {
      setError("Project name must be 100 characters or less")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName
        })
      })

      const data = await response.json()
      
      if (data.success) {
        const project: Project = data.project
        setProjectName("")
        setError("")
        onClose()
        onProjectCreated(project.id)
      } else {
        setError(data.message || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      setError('Failed to create project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      e.preventDefault()
      const formEvent = e as unknown as React.FormEvent
      handleSubmit(formEvent)
    }
    if (e.key === 'Escape' && !isCreating) {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              type="text"
              placeholder="e.g., Johnson House Staging, Downtown Condo, etc."
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value)
                if (error) setError("")
              }}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              className={error ? "border-destructive focus:border-destructive" : ""}
              maxLength={100}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Choose a descriptive name for your virtual staging project
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isCreating || !projectName.trim()}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4" />
                Create Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}