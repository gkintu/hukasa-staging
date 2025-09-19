"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutationState } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Home } from "lucide-react"
import { GenerationForm } from "@/components/image-generation/generation-form"
import { GeneratingView } from "@/components/image-generation/generating-view"
import { GenerationResultsView } from "@/components/image-generation/generation-results-view"
import { useInvalidateImageQueries, useInvalidateProjectQueries } from "@/lib/shared/hooks/use-images"
import { useGenerateImages } from "@/lib/shared/hooks/use-generate-images"
import { SourceImage, MockGeneratedImage, convertRoomTypeFromEnum, convertStyleFromEnum } from "@/components/image-generation/types"

interface Generation {
  id: string;
  stagedImagePath: string | null;
  roomType: string;
  stagingStyle: string;
  variationIndex: number;
}

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
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [generationState, setGenerationState] = useState<'form' | 'generating' | 'results' | 'loading'>('loading')
  const [generatedImages, setGeneratedImages] = useState<MockGeneratedImage[]>([])
  const [generationsData, setGenerationsData] = useState<Generation[]>([])

  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [lastVariantCount, setLastVariantCount] = useState<number>(3)

  // TanStack Query hooks
  const invalidateImageQueries = useInvalidateImageQueries()
  const invalidateProjectQueries = useInvalidateProjectQueries()
  const generateImagesMutation = useGenerateImages()

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

  // Fetch image data
  const fetchImageData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // First try to fetch from project-specific endpoint if we have project context
      const urlParams = new URLSearchParams(window.location.search)
      const projectParam = urlParams.get('project')

      let response
      if (projectParam) {
        response = await fetch(`/api/projects/${projectParam}`)
        const data = await response.json()
        if (data.success) {
          const foundImage = data.sourceImages.find((img: SourceImage) => img.id === imageId)
          if (foundImage) {
            setSourceImage(foundImage)
            setLoading(false)
            return
          }
        }
      }

      // Fallback to all images endpoint
      response = await fetch('/api/images')
      const data = await response.json()
      if (data.success) {
        const foundImage = data.sourceImages.find((img: SourceImage) => img.id === imageId)
        if (foundImage) {
          setSourceImage(foundImage)
        } else {
          setError('Image not found')
        }
      } else {
        setError('Failed to fetch image data')
      }
    } catch (err) {
      console.error('Error fetching image data:', err)
      setError('Failed to load image')
    } finally {
      setLoading(false)
    }
  }, [imageId])

  const fetchExistingGenerations = useCallback(async () => {
    if (!sourceImage) return;

    // Check if a generation is currently in progress (local OR global)
    if (generateImagesMutation.isPending || isThisImageGenerating) {
      setGenerationState('generating');
      return;
    }

    try {
      const response = await fetch(`/api/images/${sourceImage.id}/generations`);
      const data = await response.json();

      if (data.success && data.data.generations.length > 0) {
        // Store full generation data
        setGenerationsData(data.data.generations);

        // Convert database generations to MockGeneratedImage format
        const convertedImages = data.data.generations.map((gen: Generation) => ({
          id: gen.id,
          url: `/api/generations/${gen.id}/file`
        }));
        setGeneratedImages(convertedImages);
        setGenerationState('results');

        // Set the room type and style from the most recent generation
        const mostRecent = data.data.generations[0];
        setSelectedRoomType(convertRoomTypeFromEnum(mostRecent.roomType));
        setSelectedStyle(convertStyleFromEnum(mostRecent.stagingStyle));
      } else {
        // No existing generations, show form
        setGenerationState('form');
        setGeneratedImages([]);
        setGenerationsData([]);
      }
    } catch (error) {
      console.error('Error fetching existing generations:', error);
      setGenerationState('form');
    }
  }, [sourceImage, generateImagesMutation.isPending, isThisImageGenerating]);

  // Load image data on mount
  useEffect(() => {
    fetchImageData()
  }, [fetchImageData])

  // Fetch existing generations when image is loaded OR when generation state changes
  useEffect(() => {
    if (sourceImage) {
      fetchExistingGenerations();
    }
  }, [sourceImage, fetchExistingGenerations, isThisImageGenerating]);

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
        // Convert API response to display format
        const newGenerations = data.data.generations.map((gen: Generation) => ({
          id: gen.id,
          url: `/api/generations/${gen.id}/file`
        }));

        // Add new generations to existing ones
        setGeneratedImages(prev => [...prev, ...newGenerations]);
        setGenerationState('results');

        // 🔥 FIX: Invalidate caches so badge counts update INSTANTLY!
        invalidateImageQueries.invalidateAll()
        invalidateProjectQueries.invalidateAll()

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
        // Remove the deleted variant from state
        setGeneratedImages(prev => prev.filter(img => img.id !== variantId));

        // 🔥 FIX: Also remove from generationsData to keep arrays in sync
        setGenerationsData(prev => prev.filter(gen => gen.id !== variantId));

        // Invalidate cache to update badge status
        invalidateImageQueries.invalidateAll();
        invalidateProjectQueries.invalidateAll();
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

  if (loading) {
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

  if (error || !sourceImage) {
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
                {error || 'The image you are looking for could not be found.'}
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
                {sourceImage.displayName || sourceImage.originalFileName}
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
        {generationState === 'form' && (
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
        {generationState === 'generating' && (
          <div className="p-8">
            <GeneratingView sourceImage={sourceImage} />
          </div>
        )}
        {generationState === 'results' && (
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