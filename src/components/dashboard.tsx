"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Image, Lightbulb } from "lucide-react"
import { SourceImageCard } from "@/components/source-image-card"
import { useImageList, useImageMetadata } from "@/lib/shared/hooks/use-images"
import { useRouter } from "next/navigation"
import { QuickTipsModal } from "@/components/quick-tips-modal"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface DashboardProps {
  user: User
  onUploadClick?: () => void
  onNavigateToHelp?: () => void
}

export function Dashboard({ user, onUploadClick, onNavigateToHelp }: DashboardProps) {
  const router = useRouter()
  const [quickTipsOpen, setQuickTipsOpen] = useState(false)

  // ✅ Use TanStack Query for recent images (shared cache with All Images)
  // Use the SAME query as AllImages component: { unassignedOnly: false }

  // Check both metadata and imageList loading states
  const metadataQuery = useImageMetadata({ unassignedOnly: false })
  const {
    data: allImages = [],
    isLoading: imagesLoading
  } = useImageList({ unassignedOnly: false })

  // Show loading if EITHER query is loading (fixes F5 "No images yet" flash)
  const isLoading = metadataQuery.isLoading || imagesLoading

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

  if (isLoading) {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user.name || 'User'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setQuickTipsOpen(true)}
          >
            <Lightbulb className="h-4 w-4" />
            Quick Tips
          </Button>
          <Button
            onClick={onUploadClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Images
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Images */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image className="h-5 w-5" aria-hidden="true" />
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
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium mb-2">No images yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first images to start virtual staging
                </p>
                <Button onClick={onUploadClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Images
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips Modal */}
      <QuickTipsModal
        open={quickTipsOpen}
        onOpenChange={setQuickTipsOpen}
        onNavigateToHelp={onNavigateToHelp}
      />
    </div>
  )
}