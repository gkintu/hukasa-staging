'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  X,
  FileX,
  Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedbackType = 'success' | 'error' | 'warning' | 'info'

interface FeedbackMessage {
  id: string
  type: FeedbackType
  title?: string
  message: string
  details?: string[]
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface RejectedFile {
  file: File
  errors: Array<{
    code: string
    message: string
  }>
}

interface UploadFeedbackProps {
  messages?: FeedbackMessage[]
  rejectedFiles?: RejectedFile[]
  onDismiss?: (messageId: string) => void
  onRetryRejected?: (files: File[]) => void
  className?: string
}

export function UploadFeedback({ 
  messages = [], 
  rejectedFiles = [],
  onDismiss,
  onRetryRejected,
  className 
}: UploadFeedbackProps) {
  const getFeedbackIcon = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
    }
  }

  const getFeedbackVariant = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
      default:
        return 'default'
    }
  }

  const getFeedbackStyles = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600'
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-600'
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600'
      default:
        return ''
    }
  }

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'file-invalid-type':
        return 'Invalid file type. Please select image files only.'
      case 'file-too-large':
        return 'File is too large. Maximum file size is 10MB.'
      case 'file-too-small':
        return 'File is too small. Minimum file size is 1KB.'
      case 'too-many-files':
        return 'Too many files selected. Maximum 5 files allowed.'
      default:
        return 'Unknown error occurred with this file.'
    }
  }

  const retryableFiles = rejectedFiles
    .filter(({ errors }) => 
      !errors.some(error => 
        ['file-invalid-type', 'file-too-large', 'too-many-files'].includes(error.code)
      )
    )
    .map(({ file }) => file)

  if (messages.length === 0 && rejectedFiles.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Custom Messages */}
      {messages.map((message) => (
        <Alert
          key={message.id}
          variant={getFeedbackVariant(message.type)}
          className={cn(
            "relative",
            message.type !== 'error' && getFeedbackStyles(message.type)
          )}
        >
          {getFeedbackIcon(message.type)}
          
          {message.title && (
            <AlertTitle className="flex items-center justify-between">
              {message.title}
              {message.dismissible && onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(message.id)}
                  className="h-6 w-6 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </AlertTitle>
          )}
          
          <AlertDescription className="space-y-2">
            <p>{message.message}</p>
            
            {message.details && message.details.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                {message.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            )}
            
            {message.action && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={message.action.onClick}
                  className="h-7"
                >
                  {message.action.label}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {/* Rejected Files */}
      {rejectedFiles.length > 0 && (
        <Alert variant="destructive">
          <FileX className="h-4 w-4" />
          <AlertTitle>
            {rejectedFiles.length} file{rejectedFiles.length === 1 ? '' : 's'} rejected
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>The following files could not be uploaded:</p>
            
            <div className="space-y-2">
              {rejectedFiles.map(({ file, errors }, index) => (
                <div key={`${file.name}-${index}`} className="bg-destructive/10 p-2 rounded border">
                  <p className="font-medium text-sm">{file.name}</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    {errors.map((error, errorIndex) => (
                      <li key={errorIndex} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{getErrorMessage(error.code)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {retryableFiles.length > 0 && onRetryRejected && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetryRejected(retryableFiles)}
                  className="h-7"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Retry {retryableFiles.length} file{retryableFiles.length === 1 ? '' : 's'}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}