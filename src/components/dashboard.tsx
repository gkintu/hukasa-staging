"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Image, Clock } from "lucide-react"
import { SourceImageCard } from "@/components/source-image-card"
import { useImageList } from "@/lib/shared/hooks/use-images"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface DashboardProps {
  user: User
}

interface ProcessingItem {
  id: string
  name: string
  progress: number
  eta?: string
}

export function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")

  // ✅ Use TanStack Query for recent images (shared cache with All Images)
  // Use the SAME query as AllImages component: { unassignedOnly: false }
  const {
    data: allImages = [],
    isLoading: imagesLoading
  } = useImageList({ unassignedOnly: false })

  // Process images for dashboard display
  const recentImages = React.useMemo(() => {
    // Filter for staged images first (images with variants)
    const stagedImages = allImages.filter(img =>
      img.variants && img.variants.length > 0
    )

    // If we have 4+ staged images, return the 4 most recent
    if (stagedImages.length >= 4) {
      return stagedImages.slice(0, 4)
    }

    // Otherwise, mix staged + recent uploads to get 4 total
    const recentUploads = allImages
      .filter(img => !img.variants || img.variants.length === 0)
      .slice(0, 4 - stagedImages.length)

    return [...stagedImages, ...recentUploads].slice(0, 4)
  }, [allImages])

  // Handle image selection - same pattern as MainApp but with dashboard context
  const handleImageSelect = (imageId: string) => {
    let imageUrl = `/image/${imageId}`

    // Add dashboard context so back button returns to dashboard
    imageUrl += `?dashboard=true`

    router.push(imageUrl)
  }

  useEffect(() => {
    // Mock processing items for now - in real app this would come from processing status API
    const mockProcessing: ProcessingItem[] = [
      {
        id: "1",
        name: "Kitchen staging",
        progress: 65,
        eta: "~8 minutes"
      }
    ]
    setProcessingItems(mockProcessing)
  }, [])

  if (imagesLoading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="mb-8">
          <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Images Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-video bg-muted rounded animate-pulse"></div>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Upload Zone Skeleton */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user.name || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Ready to create stunning virtual staging for your listings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Images */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Recent Work
                </CardTitle>
                <CardDescription>
                  {recentImages.length > 0
                    ? "Your latest staged images and uploads"
                    : "Your virtual staging work will appear here"
                  }
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Navigate to All Images tab - same pattern as sidebar navigation
                  router.push('/?allImages=true')
                }}
              >
                View All Images
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {recentImages.map((image, index) => (
                  <SourceImageCard
                    key={image.id}
                    image={image}
                    variant="default"
                    showProjectName={true}
                    onClick={(img) => {
                      // Use same pattern as MainApp - navigate to dedicated image page
                      handleImageSelect(img.id)
                    }}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No images yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first images to start virtual staging
                </p>
                <Button onClick={() => {
                  // Could trigger upload modal or navigate to upload
                  console.log('Upload clicked')
                }}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Quick Upload
              </CardTitle>
              <CardDescription>Drop images to start staging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">Drop images here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or create project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Create New Project</SelectItem>
                    <SelectItem value="unassigned">📥 Unassigned Images</SelectItem>
                    {/* Projects would be loaded from useProjectList hook */}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {processingItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Currently Processing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processingItems.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className="text-muted-foreground">{item.progress}%</span>
                    </div>
                    <Progress value={item.progress} className="h-2" />
                    {item.eta && (
                      <p className="text-xs text-muted-foreground">{item.eta} remaining</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}