"use client"

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, Image as ImageIcon, Upload } from "lucide-react"
import { SourceImageCard } from "@/components/source-image-card"

interface ProjectDetailProps {
  projectId: string
  onBack: () => void
  onImageSelect: (imageId: string, sourceImage: SourceImage) => void
  onUploadMore?: () => void
}

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
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
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

export function ProjectDetail({ projectId, onBack, onImageSelect, onUploadMore }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjectDetail() {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        const data = await response.json()
        
        if (data.success) {
          setProject(data.project)
          setSourceImages(data.sourceImages || [])
        } else {
          console.error('Failed to fetch project details:', data.message)
        }
      } catch (error) {
        console.error('Error fetching project details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProjectDetail()
    }
  }, [projectId])


  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleImageClick = (sourceImage: SourceImage) => {
    onImageSelect(sourceImage.id, sourceImage)
  }

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
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

  if (!project) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-3">Project not found</h3>
          <p className="text-muted-foreground">This project may have been deleted or you don&apos;t have access to it.</p>
        </div>
      </div>
    )
  }

  if (sourceImages.length === 0) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              <p className="text-muted-foreground">Created {formatDate(new Date(project.createdAt))}</p>
            </div>
          </div>
          <Button 
            onClick={onUploadMore}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
        </div>

        <div className="text-center py-16">
          <ImageIcon className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold mb-3">No images in this project</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Upload some images to get started with AI virtual staging for this project.
          </p>
          <Button 
            onClick={onUploadMore}
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
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground">
              {sourceImages.length} {sourceImages.length === 1 ? 'image' : 'images'} • 
              Created {formatDate(new Date(project.createdAt))}
            </p>
          </div>
        </div>
        <Button 
          onClick={onUploadMore}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload More
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sourceImages.map((sourceImage, index) => (
          <SourceImageCard
            key={sourceImage.id}
            image={sourceImage}
            variant="default"
            showVariantCount={true}
            onClick={handleImageClick}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}