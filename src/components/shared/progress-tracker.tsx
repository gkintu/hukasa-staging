'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Upload, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProgressStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error'

export interface ProgressItem {
  id: string
  title: string
  fileSize?: number
  status: ProgressStatus
  progress: number
  error?: string
}

interface ProgressTrackerProps {
  items: ProgressItem[]
  title?: string
  className?: string
  context?: 'main' | 'admin'
}

export function ProgressTracker({ 
  items, 
  title = 'Progress Tracker',
  className,
  context = 'main'
}: ProgressTrackerProps) {
  if (items.length === 0) return null

  const getStatusIcon = (status: ProgressStatus) => {
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

  const getStatusBadge = (status: ProgressStatus) => {
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
  const totalProgress = items.length > 0 
    ? items.reduce((sum, item) => sum + item.progress, 0) / items.length 
    : 0

  const completedCount = items.filter(u => u.status === 'completed').length
  const errorCount = items.filter(u => u.status === 'error').length
  const inProgressCount = items.filter(u => u.status === 'uploading' || u.status === 'processing').length

  return (
    <Card className={cn(
      "w-full",
      context === 'admin' && 'border-admin-border',
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Overall Progress Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {title}
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
            {Math.round(totalProgress)}% complete ({completedCount} of {items.length} items)
          </p>
        </div>

        {/* Individual Progress Items */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(item.status)}
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.title}
                  </p>
                  {getStatusBadge(item.status)}
                </div>
                
                <div className="flex items-center gap-2">
                  {item.fileSize && (
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(item.fileSize)}
                    </Badge>
                  )}
                  
                  {item.status !== 'pending' && item.status !== 'error' && (
                    <span className="text-xs text-muted-foreground">
                      {item.progress}%
                    </span>
                  )}
                </div>

                {/* Progress Bar for Individual Item */}
                {(item.status === 'uploading' || item.status === 'processing') && (
                  <Progress value={item.progress} className="h-1" />
                )}

                {/* Error Message */}
                {item.status === 'error' && item.error && (
                  <p className="text-xs text-destructive">
                    {item.error}
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