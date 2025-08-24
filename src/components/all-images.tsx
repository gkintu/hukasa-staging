"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Image as ImageIcon, Upload, Settings2 } from "lucide-react"

interface AllImagesProps {
  onImageSelect: (imageId: string, sourceImage: SourceImageWithProject) => void
  onUploadClick?: () => void
}

interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface SourceImageWithProject {
  id: string
  projectId: string
  projectName: string
  originalImagePath: string
  originalFileName: string
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

export function AllImages({ onImageSelect, onUploadClick }: AllImagesProps) {
  const [sourceImages, setSourceImages] = useState<SourceImageWithProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllImages() {
      try {
        const response = await fetch('/api/images')
        const data = await response.json()
        
        if (data.success) {
          setSourceImages(data.sourceImages || [])
        } else {
          console.error('Failed to fetch all images:', data.message)
        }
      } catch (error) {
        console.error('Error fetching all images:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllImages()
  }, [])

  const getStatusBadge = (variants: GeneratedVariant[]) => {
    const completedCount = variants.filter(v => v.status === 'completed').length
    const processingCount = variants.filter(v => v.status === 'processing' || v.status === 'pending').length
    const failedCount = variants.filter(v => v.status === 'failed').length

    if (failedCount > 0) {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (processingCount > 0) {
      return <Badge variant="secondary">Processing</Badge>
    }
    if (completedCount > 0) {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
    }
    return <Badge variant="outline">No variants</Badge>
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

  const handleImageClick = (sourceImage: SourceImageWithProject) => {
    onImageSelect(sourceImage.id, sourceImage)
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Images</h1>
            <div className="h-4 bg-muted rounded w-48 animate-pulse mt-2"></div>
          </div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="aspect-video bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (sourceImages.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Images</h1>
            <p className="text-muted-foreground">All your images across all projects</p>
          </div>
          <Button 
            onClick={onUploadClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
        </div>

        <div className="text-center py-16">
          <ImageIcon className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold mb-3">No images found</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Upload some images to get started with AI virtual staging.
          </p>
          <Button 
            onClick={onUploadClick}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Your First Images
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Images</h1>
          <p className="text-muted-foreground">
            {sourceImages.length} {sourceImages.length === 1 ? 'image' : 'images'} across all your projects
          </p>
        </div>
        <Button 
          onClick={onUploadClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload More
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sourceImages.map((sourceImage, index) => (
          <Card
            key={sourceImage.id}
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleImageClick(sourceImage)}
          >
            <CardContent className="p-0">
              <div className="relative">
                <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
                  <img
                    src={`/api/files/${sourceImage.originalImagePath.split('/').pop()?.split('.')[0]}`}
                    alt={sourceImage.originalFileName}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
                
                <div className="absolute top-2 right-2 flex gap-2">
                  {getStatusBadge(sourceImage.variants)}
                </div>

                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-background/90 text-foreground">
                    {sourceImage.variants.length} {sourceImage.variants.length === 1 ? 'variant' : 'variants'}
                  </Badge>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg truncate flex-1 mr-2" title={sourceImage.originalFileName}>
                    {sourceImage.originalFileName}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium text-primary truncate" title={sourceImage.projectName}>
                    📁 {sourceImage.projectName}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <div className="flex items-center space-x-1">
                      <Settings2 className="h-3 w-3" />
                      <span className="capitalize">{sourceImage.roomType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {sourceImage.stagingStyle.charAt(0).toUpperCase() + sourceImage.stagingStyle.slice(1)} style
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {formatDate(sourceImage.createdAt)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}