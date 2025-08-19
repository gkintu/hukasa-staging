'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Upload, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error'

interface UploadItem {
  id: string
  fileName: string
  fileSize: number
  status: UploadStatus
  progress: number
  error?: string
}

interface UploadProgressProps {
  uploads: UploadItem[]
  className?: string
}

export function UploadProgress({ uploads, className }: UploadProgressProps) {
  if (uploads.length === 0) return null

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'uploading':
      case 'processing':
        return <Upload className="h-4 w-4 text-primary animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'uploading':
        return <Badge variant="default" className="bg-primary">Uploading</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-secondary">Processing</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Calculate overall progress
  const totalProgress = uploads.length > 0 
    ? uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length 
    : 0

  const completedCount = uploads.filter(u => u.status === 'completed').length
  const errorCount = uploads.filter(u => u.status === 'error').length
  const inProgressCount = uploads.filter(u => u.status === 'uploading' || u.status === 'processing').length

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Overall Progress Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Upload Progress
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{completedCount} completed</span>
              {errorCount > 0 && (
                <span className="text-destructive">{errorCount} failed</span>
              )}
              {inProgressCount > 0 && (
                <span className="text-primary">{inProgressCount} in progress</span>
              )}
            </div>
          </div>
          
          <Progress value={totalProgress} className="h-2" />
          
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(totalProgress)}% complete ({completedCount} of {uploads.length} files)
          </p>
        </div>

        {/* Individual Upload Items */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(upload.status)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {upload.fileName}
                  </p>
                  {getStatusBadge(upload.status)}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {formatFileSize(upload.fileSize)}
                  </Badge>
                  
                  {upload.status !== 'pending' && upload.status !== 'error' && (
                    <span className="text-xs text-muted-foreground">
                      {upload.progress}%
                    </span>
                  )}
                </div>

                {/* Progress Bar for Individual Item */}
                {(upload.status === 'uploading' || upload.status === 'processing') && (
                  <Progress value={upload.progress} className="h-1" />
                )}

                {/* Error Message */}
                {upload.status === 'error' && upload.error && (
                  <p className="text-xs text-destructive">
                    {upload.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}