"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { X, Download, Image as ImageIcon, Loader2, AlertCircle, Settings2, Palette, Calendar } from "lucide-react"

interface ImageDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sourceImage: SourceImage | null
}

interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface SourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

export function ImageDetailModal({ isOpen, onClose, sourceImage }: ImageDetailModalProps) {
  if (!sourceImage) return null

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (variant: GeneratedVariant) => {
    switch (variant.status) {
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>
      case 'processing':
      case 'pending':
        return <Badge variant="secondary">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleDownload = async (imagePath: string, fileName: string) => {
    try {
      const fileId = imagePath.split('/').pop()?.split('.')[0]
      if (!fileId) return
      
      const response = await fetch(`/api/files/${fileId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleDownloadSource = () => {
    handleDownload(sourceImage.originalImagePath, sourceImage.originalFileName)
  }

  const handleDownloadVariant = (variant: GeneratedVariant) => {
    if (variant.stagedImagePath) {
      const fileName = `staged_${sourceImage.originalFileName.split('.')[0]}_v${variant.variationIndex}.${sourceImage.originalFileName.split('.').pop()}`
      handleDownload(variant.stagedImagePath, fileName)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold truncate pr-4">
              {sourceImage.displayName || sourceImage.originalFileName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Source Image Section - Left Side */}
          <div className="w-1/2 p-6 pr-3 border-r overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Original Image</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSource}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                    <img
                      src={`/api/files/${sourceImage.originalImagePath.split('/').pop()?.split('.')[0]}`}
                      alt={sourceImage.displayName || sourceImage.originalFileName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder.svg'
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Image Metadata */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">File Size</span>
                    <p className="font-medium">{formatFileSize(sourceImage.fileSize)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uploaded</span>
                    <p className="font-medium">{formatDate(sourceImage.createdAt)}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Room Type</span>
                    <Badge variant="outline" className="capitalize">
                      {sourceImage.roomType.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Staging Style</span>
                    <Badge variant="outline" className="capitalize">
                      {sourceImage.stagingStyle}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Operation</span>
                    <Badge variant="outline" className="capitalize">
                      {sourceImage.operationType.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Variants Section - Right Side */}
          <div className="w-1/2 p-6 pl-3 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  AI Generated Variants ({sourceImage.variants.length})
                </h3>
              </div>

              {sourceImage.variants.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No variants generated yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sourceImage.variants.map((variant) => (
                    <Card key={variant.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative">
                          {/* Variant Image */}
                          <div className="aspect-video overflow-hidden bg-muted">
                            {variant.status === 'completed' && variant.stagedImagePath ? (
                              <img
                                src={`/api/files/${variant.stagedImagePath.split('/').pop()?.split('.')[0]}`}
                                alt={`Variant ${variant.variationIndex}`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = '/placeholder.svg'
                                }}
                              />
                            ) : variant.status === 'processing' || variant.status === 'pending' ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">Processing...</p>
                                </div>
                              </div>
                            ) : variant.status === 'failed' ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center">
                                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                                  <p className="text-sm text-destructive">Generation Failed</p>
                                  {variant.errorMessage && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {variant.errorMessage}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Variant Header */}
                          <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
                            <Badge variant="secondary" className="bg-background/90 text-foreground">
                              Variant {variant.variationIndex}
                            </Badge>
                            {getStatusBadge(variant)}
                          </div>

                          {/* Download Button for Completed Variants */}
                          {variant.status === 'completed' && variant.stagedImagePath && (
                            <div className="absolute bottom-2 right-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDownloadVariant(variant)}
                                className="bg-background/90 hover:bg-background gap-2"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Variant Info */}
                        {variant.completedAt && (
                          <div className="p-3 bg-muted/30">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Completed {formatDate(variant.completedAt)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}