"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutationState, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Home } from "lucide-react"
import { GenerationForm } from "@/components/image-generation/generation-form"
import { GeneratingView } from "@/components/image-generation/generating-view"
import { GenerationResultsView } from "@/components/image-generation/generation-results-view"
import { useImageList, useImageGenerations } from "@/lib/shared/hooks/use-images"
import { useGenerateImages } from "@/lib/shared/hooks/use-generate-images"
import { MockGeneratedImage, convertRoomTypeFromEnum, convertStyleFromEnum } from "@/components/image-generation/types"
import { GeneratedVariant } from "@/lib/shared/types/image-types"

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface ImageDetailPageProps {
  imageId: string
  user?: User
}

export function ImageDetailPage({ imageId }: ImageDetailPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [generationState, setGenerationState] = useState<'form' | 'generating' | 'results' | 'loading'>('loading')
  const [generatedImages, setGeneratedImages] = useState<MockGeneratedImage[]>([])

  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [lastVariantCount, setLastVariantCount] = useState<number>(3)

  // Check URL params for project context
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const projectParam = urlParams?.get('project')

  // TanStack Query hooks
  const generateImagesMutation = useGenerateImages()

  // Use the new useImageList hook with project filtering if needed
  const { data: images, isLoading, error } = useImageList(
    projectParam ? { projectId: projectParam } : {}
  )

  // Fetch generations using TanStack Query (replaces raw fetch)
  const { data: generationsData = [], isLoading: isLoadingGenerations } = useImageGenerations(imageId)

  // Find the specific image from the list
  const sourceImage = images?.find(img => img.id === imageId) || null

  // Use useMutationState to track ongoing generations globally across navigation
  const pendingGenerations = useMutationState({
    filters: {
      mutationKey: ['generateImages'],
      status: 'pending'
    },
    select: (mutation) => mutation.state.variables
  })

  // Check if this specific image has a pending generation
  const isThisImageGenerating = useMemo(() => {
    return pendingGenerations.some(
      (variables: unknown) => {
        const vars = variables as { sourceImageId?: string }
        return vars?.sourceImageId === imageId
      }
    )
  }, [pendingGenerations, imageId])

  // Error handling for image not found
  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : null

  // Update UI state based on TanStack Query data
  useEffect(() => {
    if (!sourceImage || isLoading || isLoadingGenerations) {
      setGenerationState('loading');
      return;
    }

    // Check if a generation is currently in progress (local OR global)
    if (generateImagesMutation.isPending || isThisImageGenerating) {
      setGenerationState('generating');
      return;
    }

    if (generationsData.length > 0) {
      // Convert database generations to MockGeneratedImage format using signed URLs
      const convertedImages = generationsData.map((gen: GeneratedVariant) => ({
        id: gen.id,
        url: gen.signedUrl || '' // Use empty string if no signed URL
      }));
      setGeneratedImages(convertedImages);
      setGenerationState('results');

      // Set the room type and style from the most recent generation
      const mostRecent = generationsData[0];
      setSelectedRoomType(convertRoomTypeFromEnum(mostRecent.roomType));
      setSelectedStyle(convertStyleFromEnum(mostRecent.stagingStyle));
    } else {
      // No existing generations, show form
      setGenerationState('form');
      setGeneratedImages([]);
    }
  }, [sourceImage, isLoading, isLoadingGenerations, generationsData, generateImagesMutation.isPending, isThisImageGenerating]);

  const handleGenerate = async (imageCount: number = 3, prompt?: string, roomType?: string, stagingStyle?: string) => {
    setLastVariantCount(imageCount); // Remember the count for next time

    // Log generated prompt for debugging
    if (prompt) {
      console.log('🎨 Generated Prompt:', prompt);
    }

    // Use provided parameters or fall back to selected state
    const finalRoomType = roomType || selectedRoomType;
    const finalStagingStyle = stagingStyle || selectedStyle;

    // Validate that both room type and style are selected
    if (!finalRoomType || !finalStagingStyle) {
      console.error('Generation cancelled: Room type and furniture style must be selected');
      return;
    }

    // Switch to generating view immediately when starting generation
    setGenerationState('generating');

    // Use the optimistic mutation hook
    generateImagesMutation.mutate({
      sourceImageId: sourceImage!.id,
      roomType: finalRoomType,
      stagingStyle: finalStagingStyle,
      imageCount: imageCount
    }, {
      onSuccess: (data) => {
        // Convert API response to display format using signed URLs
        const newGenerations = data.data.generations.map((gen: GeneratedVariant) => ({
          id: gen.id,
          url: gen.signedUrl || '' // Use empty string if no signed URL
        }));

        // Add new generations to existing ones
        setGeneratedImages(prev => [...prev, ...newGenerations]);
        setGenerationState('results');

        // 🔥 FIX: Force refetch of all image/project queries (active AND inactive)
        // Using refetchType: 'all' ensures inactive queries refetch when component remounts
        queryClient.invalidateQueries({
          queryKey: ['images'],
          exact: false,
          refetchType: 'all'
        })
        queryClient.invalidateQueries({
          queryKey: ['imageUrls'],
          exact: false,
          refetchType: 'all'
        })
        queryClient.invalidateQueries({
          queryKey: ['projects'],
          exact: false,
          refetchType: 'all'
        })

        console.log(`✅ Successfully generated ${newGenerations.length} variants`);
      },
      onError: (error) => {
        console.error('❌ Generation failed:', error);
        // Stay on current view if we have results, otherwise go back to form
        if (generatedImages.length === 0) {
          setGenerationState('form');
        } else {
          setGenerationState('results');
        }
      }
    });
  }

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const response = await fetch(`/api/images/variants/${variantId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Invalidate the specific generations query for this image
        queryClient.invalidateQueries({
          queryKey: ['image', imageId, 'generations']
        });

        // Force refetch all image/project queries (active AND inactive)
        queryClient.invalidateQueries({
          queryKey: ['images'],
          exact: false,
          refetchType: 'all'
        });

        queryClient.invalidateQueries({
          queryKey: ['imageUrls'],
          exact: false,
          refetchType: 'all'
        });

        queryClient.invalidateQueries({
          queryKey: ['projects'],
          exact: false,
          refetchType: 'all'
        });

        // The useEffect will automatically update generatedImages when generationsData refreshes
      } else {
        console.error('Failed to delete variant:', data.message);
        alert(`Delete failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('Delete failed: Network error');
    }
  }

  const getBackButtonText = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const projectParam = urlParams.get('project')
    const allImagesParam = urlParams.get('allImages')

    if (projectParam) {
      return "Back to Project"
    } else if (allImagesParam) {
      return "Back to All Images"
    } else {
      return "Back"
    }
  }

  const handleBack = () => {
    // Try to determine where to go back to based on URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const projectParam = urlParams.get('project')
    const allImagesParam = urlParams.get('allImages')
    const unassignedParam = urlParams.get('unassigned')

    if (projectParam) {
      router.push(`/?project=${projectParam}`)
    } else if (allImagesParam) {
      router.push('/?allImages=true')
    } else if (unassignedParam) {
      router.push('/?unassigned=true')
    } else {
      router.push('/')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-muted rounded-lg h-96 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (errorMessage || (!isLoading && !sourceImage)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Image Not Found</h1>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-muted/50 rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Image Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || 'The image you are looking for could not be found.'}
              </p>
              <Button onClick={handleBack} className="gap-2">
                <Home className="h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              {getBackButtonText()}
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {sourceImage?.displayName || sourceImage?.originalFileName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {generationState === 'form' ? 'Generate Staging Variants' :
                 generationState === 'generating' ? 'Generating Variants' :
                 'Generation Results'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {generationState === 'loading' && (
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading generation data...</p>
            </div>
          </div>
        )}
        {generationState === 'form' && sourceImage && (
          <GenerationForm
            sourceImage={sourceImage}
            onClose={handleBack}
            onGenerate={handleGenerate}
            selectedRoomType={selectedRoomType}
            setSelectedRoomType={setSelectedRoomType}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            previousVariantCount={lastVariantCount}
            autoExpandAdvanced={generatedImages.length > 0}
            isGenerating={generateImagesMutation.isPending}
            showHeader={false}
          />
        )}
        {generationState === 'generating' && sourceImage && (
          <div className="p-8">
            <GeneratingView sourceImage={sourceImage} />
          </div>
        )}
        {generationState === 'results' && sourceImage && (
          <GenerationResultsView
            sourceImage={sourceImage}
            generatedImages={generatedImages}
            generationsData={generationsData}
            onRegenerate={handleGenerate}
            onDeleteVariant={handleDeleteVariant}
            onUpdateSelections={(roomType, furnitureStyle) => {
              setSelectedRoomType(roomType);
              setSelectedStyle(furnitureStyle);
            }}
            roomType={selectedRoomType}
            furnitureStyle={selectedStyle}
            defaultVariantCount={lastVariantCount}
            isGenerating={generateImagesMutation.isPending}
          />
        )}
      </div>
    </div>
  )
}