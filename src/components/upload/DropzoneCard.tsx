'use client'

import React, { useCallback, useState } from 'react'
import Image from 'next/image'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileImage, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DroppedFile extends File {
  preview?: string
}

interface RejectedFile {
  file: File
  errors: Array<{
    code: string
    message: string
  }>
}

interface DropzoneCardProps {
  onFilesAccepted?: (files: File[]) => void
  onFilesRejected?: (rejectedFiles: RejectedFile[]) => void
  maxFiles?: number
  maxSize?: number
  className?: string
}

export function DropzoneCard({
  onFilesAccepted,
  onFilesRejected,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  className
}: DropzoneCardProps) {
  const [files, setFiles] = useState<DroppedFile[]>([])

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // Add preview URLs to accepted files
    const filesWithPreview = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
    )
    
    setFiles(prev => [...prev, ...filesWithPreview])
    onFilesAccepted?.(acceptedFiles)
    
    if (fileRejections.length > 0) {
      // Convert FileRejection[] to RejectedFile[]
      const rejectedFiles: RejectedFile[] = fileRejections.map((rejection: FileRejection) => ({
        file: rejection.file,
        errors: rejection.errors.map((error) => ({
          code: error.code,
          message: error.message
        }))
      }))
      onFilesRejected?.(rejectedFiles)
    }
  }, [onFilesAccepted, onFilesRejected])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    open
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles,
    maxSize,
    noClick: true, // Disable click to open, we'll use a button
    noKeyboard: true
  })

  const removeFile = useCallback((fileToRemove: DroppedFile) => {
    setFiles(prev => {
      const filtered = prev.filter(file => file !== fileToRemove)
      // Revoke the preview URL to prevent memory leaks
      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return filtered
    })
  }, [])

  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [files])

  const dropzoneStyles = cn(
    "border-2 border-dashed rounded-lg transition-colors duration-200 ease-in-out",
    {
      "border-primary bg-primary/5": isDragAccept,
      "border-destructive bg-destructive/5": isDragReject,
      "border-muted-foreground/25 hover:border-primary/50": !isDragActive,
      "border-primary bg-primary/10": isDragActive && !isDragReject
    }
  )

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Images
        </CardTitle>
        <CardDescription>
          Drag and drop room images or click to select files. Maximum {maxFiles} files, {Math.round(maxSize / (1024 * 1024))}MB each.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(dropzoneStyles, "p-8 text-center cursor-pointer")}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <FileImage className="h-8 w-8 text-primary" />
            </div>
            
            {isDragActive ? (
              <div className="space-y-2">
                {isDragAccept && (
                  <p className="text-primary font-medium">
                    Drop the images here
                  </p>
                )}
                {isDragReject && (
                  <p className="text-destructive font-medium">
                    Some files will be rejected
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Drag images here
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPEG, PNG, WebP formats
                </p>
              </div>
            )}

            <Button 
              type="button"
              variant="default"
              size="sm"
              onClick={open}
              className="mt-2"
            >
              Browse Files
            </Button>
          </div>
        </div>

        {/* File Preview List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Selected Files ({files.length})</h4>
            <div className="grid gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {file.preview && (
                    <div className="flex-shrink-0">
                      <Image
                        src={file.preview}
                        alt={file.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover rounded border"
                        onLoad={() => {
                          // Revoke URL after image loads to free memory
                          URL.revokeObjectURL(file.preview!)
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {file.type.split('/')[1]?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file)}
                    className="flex-shrink-0 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}