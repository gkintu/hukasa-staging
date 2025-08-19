'use client'

import React from 'react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Eye, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  src: string
  alt: string
  fileName?: string
  fileSize?: number
  fileType?: string
  isUploading?: boolean
  uploadProgress?: number
  onDownload?: () => void
  onRegenerate?: () => void
  onDelete?: () => void
  onPreview?: () => void
  className?: string
  showActions?: boolean
}

export function ImagePreview({
  src,
  alt,
  fileName,
  fileSize,
  fileType,
  isUploading = false,
  uploadProgress = 0,
  onDownload,
  onRegenerate,
  onDelete,
  onPreview,
  className,
  showActions = true
}: ImagePreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="relative">
          <AspectRatio ratio={16 / 10} className="bg-muted">
            <img
              src={src}
              alt={alt}
              className="object-cover w-full h-full rounded-t-lg"
              loading="lazy"
            />
            
            {/* Upload Progress Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="w-full max-w-[80%] space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Uploading...
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Action Button */}
            {!isUploading && onPreview && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onPreview}
                  className="bg-background/90 hover:bg-background"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            )}
          </AspectRatio>
        </div>

        {/* File Information */}
        <div className="p-3 space-y-3">
          {fileName && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground truncate" title={fileName}>
                {fileName}
              </p>
              <div className="flex items-center gap-2">
                {fileSize && (
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(fileSize)}
                  </Badge>
                )}
                {fileType && (
                  <Badge variant="outline" className="text-xs">
                    {fileType.split('/')[1]?.toUpperCase() || fileType.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && !isUploading && (
            <div className="flex gap-2">
              {onDownload && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onDownload}
                  className="flex-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
              
              <div className="flex gap-1">
                {onRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerate}
                    className="px-2"
                    title="Regenerate with different style"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="px-2 hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete image"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}