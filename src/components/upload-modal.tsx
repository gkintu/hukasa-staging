"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropzoneCard, 
  UploadProgress, 
  UploadFeedback, 
  type UploadItem,
  type FeedbackMessage,
  type RejectedFile
} from '@/components/upload'
import { X, Upload, FileImage, FolderPlus, Folder } from "lucide-react"
import { nanoid } from 'nanoid'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
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

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  user?: User
  projectId?: string
}

export function UploadModal({ isOpen, onClose, projectId }: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // Project selection state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '')
  const [createNewProject, setCreateNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Load projects when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingProjects(true)
      fetch('/api/projects')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setProjects(data.projects)
          }
        })
        .catch(error => {
          console.error('Error loading projects:', error)
        })
        .finally(() => {
          setLoadingProjects(false)
        })
    }
  }, [isOpen])

  // Update selectedProjectId when projectId prop changes
  useEffect(() => {
    setSelectedProjectId(projectId || '')
  }, [projectId])

  const handleFilesAccepted = useCallback(async (files: File[]) => {
    setIsUploading(true)
    setRejectedFiles([])
    
    // Create upload items for progress tracking
    const newUploads: UploadItem[] = files.map(file => ({
      id: nanoid(),
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      progress: 0
    }))

    setUploads(prev => [...prev, ...newUploads])

    try {
      // Create form data
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      
      // Add project information based on user selection
      if (createNewProject && newProjectName.trim()) {
        formData.append('projectName', newProjectName.trim())
      } else if (selectedProjectId) {
        formData.append('projectId', selectedProjectId)
      }
      // If neither is provided, it will go to unassigned project

      // Upload files
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Update upload progress to completed
        setUploads(prev => 
          prev.map(upload => {
            const isCurrentUpload = newUploads.some(nu => nu.id === upload.id)
            return isCurrentUpload 
              ? { ...upload, status: 'completed', progress: 100 }
              : upload
          })
        )

        // Add success message
        const successMessage: FeedbackMessage = {
          id: nanoid(),
          type: 'success',
          title: 'Upload Successful',
          message: result.message || `Successfully uploaded ${result.files?.length} files.`,
          dismissible: true
        }
        setFeedbackMessages(prev => [...prev, successMessage])

      } else {
        // Handle partial or complete failure
        setUploads(prev => 
          prev.map(upload => {
            const isCurrentUpload = newUploads.some(nu => nu.id === upload.id)
            return isCurrentUpload 
              ? { ...upload, status: 'error', progress: 0, error: result.message }
              : upload
          })
        )

        // Add error message
        const errorMessage: FeedbackMessage = {
          id: nanoid(),
          type: 'error',
          title: 'Upload Failed',
          message: result.message || 'Some files could not be uploaded.',
          details: result.errors?.map((e: { fileName: string; error: string }) => `${e.fileName}: ${e.error}`),
          dismissible: true
        }
        setFeedbackMessages(prev => [...prev, errorMessage])
      }

      // Handle file rejections from server
      if (result.errors && result.errors.length > 0) {
        const serverRejections: RejectedFile[] = result.errors.map((error: { fileName: string; error: string; code?: string }) => ({
          file: files.find(f => f.name === error.fileName)!,
          errors: [{
            code: error.code || 'server-error',
            message: error.error
          }]
        })).filter((rejection: RejectedFile) => rejection.file)

        setRejectedFiles(prev => [...prev, ...serverRejections])
      }

    } catch (error) {
      console.error('Upload error:', error)
      
      // Mark all uploads as failed
      setUploads(prev => 
        prev.map(upload => {
          const isCurrentUpload = newUploads.some(nu => nu.id === upload.id)
          return isCurrentUpload 
            ? { ...upload, status: 'error', progress: 0, error: 'Network error' }
            : upload
        })
      )

      // Add error message
      const errorMessage: FeedbackMessage = {
        id: nanoid(),
        type: 'error',
        title: 'Upload Error',
        message: 'Failed to upload files. Please check your connection and try again.',
        dismissible: true
      }
      setFeedbackMessages(prev => [...prev, errorMessage])
    } finally {
      setIsUploading(false)
    }
  }, [createNewProject, newProjectName, selectedProjectId])

  const handleFilesRejected = useCallback((rejectedFiles: RejectedFile[]) => {
    setRejectedFiles(prev => [...prev, ...rejectedFiles])
  }, [])

  const handleDismissMessage = useCallback((messageId: string) => {
    setFeedbackMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  const handleRetryRejected = useCallback((files: File[]) => {
    // Clear previous rejections and retry upload
    setRejectedFiles([])
    handleFilesAccepted(files)
  }, [handleFilesAccepted])

  const handleClose = () => {
    if (!isUploading) {
      // Reset state when closing
      setUploads([])
      setFeedbackMessages([])
      setRejectedFiles([])
      setCreateNewProject(false)
      setNewProjectName('')
      setSelectedProjectId(projectId || '')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Selection - Only show if no projectId was provided */}
          {!projectId && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Project Destination</Label>
              </div>
              
              <div className="space-y-3">
                {/* Create New Project Option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-new-project"
                    checked={createNewProject}
                    onCheckedChange={(checked) => {
                      setCreateNewProject(checked === true)
                      if (checked) {
                        setSelectedProjectId('')
                      }
                    }}
                    disabled={isUploading}
                  />
                  <Label 
                    htmlFor="create-new-project" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Create new project
                  </Label>
                </div>

                {/* New Project Name Input */}
                {createNewProject && (
                  <div className="ml-6 space-y-2">
                    <Input
                      placeholder="Enter project name (e.g., Johnson House Staging)"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      disabled={isUploading}
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      A new project will be created with this name
                    </p>
                  </div>
                )}

                {/* Existing Project Selection */}
                {!createNewProject && (
                  <div className="space-y-2">
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                      disabled={isUploading || loadingProjects}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select existing project or skip to use Unassigned"} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <span>{project.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({project.sourceImageCount} images)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedProjectId 
                        ? "Images will be added to the selected project" 
                        : "Skip selection to add images to Unassigned folder for organizing later"
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          <UploadFeedback
            messages={feedbackMessages}
            rejectedFiles={rejectedFiles}
            onDismiss={handleDismissMessage}
            onRetryRejected={handleRetryRejected}
          />

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <UploadProgress uploads={uploads} />
          )}

          {/* Dropzone */}
          <DropzoneCard
            onFilesAccepted={handleFilesAccepted}
            onFilesRejected={handleFilesRejected}
            maxFiles={5}
            maxSize={10 * 1024 * 1024}
          />

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Upload Tips
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use high-resolution images (minimum 1200x800px) for best results</li>
              <li>• Supported formats: JPG, PNG, WEBP</li>
              <li>• Maximum file size: 10MB per image</li>
              <li>• Upload up to 5 images at once</li>
              <li>• Empty or minimally furnished rooms work best</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              {uploads.some(u => u.status === 'completed') ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}