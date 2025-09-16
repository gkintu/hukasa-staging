"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { SourceImage, MockGeneratedImage, convertRoomTypeFromEnum, convertStyleFromEnum } from "./types"

interface Generation {
  id: string;
  stagedImagePath: string | null;
  roomType: string;
  stagingStyle: string;
  variationIndex: number;
}
import { GenerationForm } from "./generation-form"
import { GeneratingView } from "./generating-view"
import { GenerationResultsView } from "./generation-results-view"
import { useInvalidateImageQueries, useInvalidateProjectQueries } from "@/lib/shared/hooks/use-images"
import { useGenerateImages } from "@/lib/shared/hooks/use-generate-images"

interface ImageDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sourceImage: SourceImage | null
}

export function ImageDetailModal({ isOpen, onClose, sourceImage }: ImageDetailModalProps) {
  const [generationState, setGenerationState] = useState<'form' | 'generating' | 'results'>('form');
  const [generatedImages, setGeneratedImages] = useState<MockGeneratedImage[]>([]);
  const [generationsData, setGenerationsData] = useState<Generation[]>([]);
  
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [lastVariantCount, setLastVariantCount] = useState<number>(3)
  
  // TanStack Query hooks
  const invalidateImageQueries = useInvalidateImageQueries()
  const invalidateProjectQueries = useInvalidateProjectQueries()
  const generateImagesMutation = useGenerateImages()

  const fetchExistingGenerations = useCallback(async () => {
    if (!sourceImage) return;
    
    // Check if a generation is currently in progress
    if (generateImagesMutation.isPending) {
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
  }, [sourceImage, generateImagesMutation.isPending]);

  // Fetch existing generations when modal opens
  useEffect(() => {
    if (isOpen && sourceImage) {
      fetchExistingGenerations();
    }
  }, [isOpen, sourceImage, fetchExistingGenerations]);

  if (!sourceImage) return null

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
      sourceImageId: sourceImage.id,
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
  
  const handleClose = () => {
    onClose();
    // Delay resetting state to avoid UI flicker during closing animation
    setTimeout(() => {
      setGenerationState('form');
      setGeneratedImages([]);
      setGenerationsData([]);
      setSelectedRoomType("");
      setSelectedStyle("");
    }, 300);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-hidden bg-background border-border p-0">
        <VisuallyHidden>
          <DialogTitle>
            {generationState === 'form' ? 'Generate Staging Variants' : 
             generationState === 'generating' ? 'Generating Variants' : 
             'Generation Results'}
          </DialogTitle>
        </VisuallyHidden>
        {generationState === 'form' && (
          <GenerationForm 
            sourceImage={sourceImage}
            onClose={handleClose}
            onGenerate={handleGenerate}
            selectedRoomType={selectedRoomType}
            setSelectedRoomType={setSelectedRoomType}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            previousVariantCount={lastVariantCount}
            autoExpandAdvanced={generatedImages.length > 0}
            isGenerating={generateImagesMutation.isPending}
          />
        )}
        {generationState === 'generating' && <GeneratingView sourceImage={sourceImage} />}
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
      </DialogContent>
    </Dialog>
  )
}
