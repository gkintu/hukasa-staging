'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropzoneCard, 
  UploadProgress, 
  UploadFeedback, 
  FileManager,
  type UploadItem,
  type FeedbackMessage,
  type RejectedFile,
  type ManagedFile 
} from '@/components/upload'
import { Upload, FileImage, Settings, User } from 'lucide-react'
import { nanoid } from 'nanoid'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface DashboardContentProps {
  user: User
}

export function DashboardContent({ user }: DashboardContentProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([])
  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

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

        // Add to managed files if available
        if (result.files) {
          const newManagedFiles: ManagedFile[] = result.files.map(file => ({
            id: file.id,
            fileName: file.fileName,
            originalFileName: file.originalFileName,
            fileSize: file.fileSize,
            fileType: file.fileType,
            status: 'uploaded',
            uploadedAt: new Date(file.uploadedAt),
            thumbnailUrl: `/api/files/${btoa(`${user.id}:${file.relativePath}`)}`,
            downloadUrl: `/api/files/${btoa(`${user.id}:${file.relativePath}`)}/download`
          }))
          
          setManagedFiles(prev => [...prev, ...newManagedFiles])
        }

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
          details: result.errors?.map(e => `${e.fileName}: ${e.error}`),
          dismissible: true
        }
        setFeedbackMessages(prev => [...prev, errorMessage])
      }

      // Handle file rejections from server
      if (result.errors && result.errors.length > 0) {
        const serverRejections: RejectedFile[] = result.errors.map(error => ({
          file: files.find(f => f.name === error.fileName)!,
          errors: [{
            code: error.code || 'server-error',
            message: error.error
          }]
        })).filter(rejection => rejection.file)

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
  }, [user.id])

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

  const handleFileDownload = useCallback((file: ManagedFile) => {
    if (file.downloadUrl) {
      const link = document.createElement('a')
      link.href = file.downloadUrl
      link.download = file.originalFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [])

  const handleFileDelete = useCallback((files: ManagedFile[]) => {
    // Remove from managed files list
    const fileIds = new Set(files.map(f => f.id))
    setManagedFiles(prev => prev.filter(f => !fileIds.has(f.id)))
    
    // Add confirmation message
    const message: FeedbackMessage = {
      id: nanoid(),
      type: 'info',
      message: `Deleted ${files.length} file${files.length === 1 ? '' : 's'}.`,
      dismissible: true
    }
    setFeedbackMessages(prev => [...prev, message])
  }, [])

  const handleBulkDownload = useCallback((files: ManagedFile[]) => {
    files.forEach(file => {
      if (file.downloadUrl) {
        const link = document.createElement('a')
        link.href = file.downloadUrl
        link.download = file.originalFileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    })
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome back, {user.name || 'User'}
          </CardTitle>
          <CardDescription>
            Transform empty rooms into beautifully staged spaces with AI virtual staging
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            My Files ({managedFiles.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
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

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Common tasks for virtual staging workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button variant="outline" disabled={isUploading}>
                <FileImage className="h-4 w-4 mr-2" />
                Browse Templates
              </Button>
              <Button variant="outline" disabled={isUploading}>
                <Settings className="h-4 w-4 mr-2" />
                Staging Presets
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6">
          <FileManager
            files={managedFiles}
            onDownload={handleFileDownload}
            onDelete={handleFileDelete}
            onBulkDownload={handleBulkDownload}
            onPreview={(file) => {
              // TODO: Implement preview modal
              console.log('Preview file:', file)
            }}
            onRegenerate={(file) => {
              // TODO: Implement regeneration
              console.log('Regenerate file:', file)
            }}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-lg font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-medium">Preferences</h3>
                <div className="text-sm text-muted-foreground">
                  <p>• Default staging style: Modern</p>
                  <p>• File format: High-resolution JPEG</p>
                  <p>• Auto-download: Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}