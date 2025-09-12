"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Upload, FileImage, FolderPlus, Folder } from "lucide-react"
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
  onUploadSuccess?: () => void
}

export function UploadModal({ isOpen, onClose, projectId, onUploadSuccess }: UploadModalProps) {
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

        // Notify parent component of successful upload
        onUploadSuccess?.()

      } else {
        // Handle partial or complete failure
        setUploads(prev => 
          prev.map(upload => {
            const isCurrentUpload = newUploads.some(nu => nu.id === upload.id)
            return isCurrentUpload 
              ? { ...upload, status: 'failed', progress: 0, error: result.message }
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
            ? { ...upload, status: 'failed', progress: 0, error: 'Network error' }
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
  }, [createNewProject, newProjectName, selectedProjectId, onUploadSuccess])

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </DialogTitle>
          <DialogDescription>
            Upload room images for virtual staging.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* Project Selection - Only show if no projectId was provided */}
            {!projectId && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Project Destination</Label>
                </div>
                
                <div className="space-y-4">
                  {/* Create New Project Option */}
                  <div className="flex items-center space-x-3">
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
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Create new project
                    </Label>
                  </div>

                  {/* New Project Name Input */}
                  {createNewProject && (
                    <div className="ml-6">
                      <Input
                        placeholder="Project name (e.g., Johnson House Staging)"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        disabled={isUploading}
                        maxLength={100}
                        className="mb-2"
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
                          <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select existing project (optional)"} />
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
                          : "Leave empty to add to Unassigned folder"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dropzone - Main focal point */}
            <DropzoneCard
              onFilesAccepted={handleFilesAccepted}
              onFilesRejected={handleFilesRejected}
              maxFiles={5}
              maxSize={10 * 1024 * 1024}
            />

            {/* Upload Progress */}
            {uploads.length > 0 && (
              <UploadProgress uploads={uploads} />
            )}

            {/* Feedback Messages */}
            <UploadFeedback
              messages={feedbackMessages}
              rejectedFiles={rejectedFiles}
              onDismiss={handleDismissMessage}
              onRetryRejected={handleRetryRejected}
            />

            {/* Tips */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileImage className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Upload Tips</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• High-resolution images (1200x800px+) work best</li>
                <li>• Formats: JPG, PNG, WEBP, HEIC, TIFF, BMP</li>
                <li>• Max 10MB per file, up to 5 files at once</li>
                <li>• Empty or minimal furniture gives better results</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t border-border p-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="min-w-20"
            >
              {uploads.some(u => u.status === 'completed') ? 'Done' : isUploading ? 'Uploading...' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}