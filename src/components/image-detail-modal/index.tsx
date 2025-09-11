"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { SourceImage, MockGeneratedImage, mockGeneratedImages, convertRoomTypeFromEnum, convertStyleFromEnum } from "./types"

interface Generation {
  id: string;
  stagedImagePath: string;
}
import { GenerationForm } from "./generation-form"
import { GeneratingView } from "./generating-view"
import { GenerationResultsView } from "./generation-results-view"
import { useInvalidateImageQueries, useInvalidateProjectQueries } from "@/lib/shared/hooks/use-images"

interface ImageDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sourceImage: SourceImage | null
}

export function ImageDetailModal({ isOpen, onClose, sourceImage }: ImageDetailModalProps) {
  const [generationState, setGenerationState] = useState<'form' | 'generating' | 'results'>('form');
  const [generatedImages, setGeneratedImages] = useState<MockGeneratedImage[]>([]);
  
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [lastVariantCount, setLastVariantCount] = useState<number>(3)
  
  // TanStack Query invalidation hooks
  const invalidateImageQueries = useInvalidateImageQueries()
  const invalidateProjectQueries = useInvalidateProjectQueries()

  const fetchExistingGenerations = useCallback(async () => {
    if (!sourceImage) return;
    
    try {
      const response = await fetch(`/api/images/${sourceImage.id}/generations`);
      const data = await response.json();
      
      if (data.success && data.data.generations.length > 0) {
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
      }
    } catch (error) {
      console.error('Error fetching existing generations:', error);
      setGenerationState('form');
    }
  }, [sourceImage]);

  // Fetch existing generations when modal opens
  useEffect(() => {
    if (isOpen && sourceImage) {
      fetchExistingGenerations();
    }
  }, [isOpen, sourceImage, fetchExistingGenerations]);

  if (!sourceImage) return null

  const handleGenerate = async (imageCount: number = 3, prompt?: string) => {
    setLastVariantCount(imageCount); // Remember the count for next time
    
    // Log generated prompt for debugging
    if (prompt) {
      console.log('🎨 Generated Prompt:', prompt);
    }
    
    // Validate that both room type and style are selected
    if (!selectedRoomType || !selectedStyle) {
      console.error('Generation cancelled: Room type and furniture style must be selected');
      // TODO: Show user-friendly error message (toast notification or alert)
      return;
    }

    // Use NEXT_PUBLIC_MOCK_API env var to toggle mock flow
    if (process.env.NEXT_PUBLIC_MOCK_API === 'true') {
      setGenerationState('generating');
      
      try {
        // Save mock generations to database
        const response = await fetch(`/api/images/${sourceImage.id}/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomType: selectedRoomType,
            stagingStyle: selectedStyle,
            prompt: prompt,
            mockGenerations: mockGeneratedImages.slice(0, imageCount)
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Convert saved generations back to MockGeneratedImage format
          const newGenerations = data.data.generations.map((gen: Generation) => ({
            id: gen.id,
            url: `/api/generations/${gen.id}/file`
          }));
          
          // Add new generations to existing ones (additive)
          setGeneratedImages(prev => [...prev, ...newGenerations]);
          setGenerationState('results');
          
          // ✅ Invalidate TanStack Query cache to update badge status immediately
          invalidateImageQueries.invalidateAll();
          invalidateProjectQueries.invalidateAll();
        } else {
          console.error('Failed to save generations:', data.message);
          setGenerationState('form');
          // TODO: Show user-friendly error message with data.message
          alert(`Generation failed: ${data.message}`);
        }
      } catch (error) {
        console.error('Error saving generations:', error);
        // Fallback to old mock behavior
        setTimeout(() => {
          setGeneratedImages(prev => [...prev, ...mockGeneratedImages.slice(0, imageCount)]);
          setGenerationState('results');
        }, 2000);
      }
    } else {
      // Real AI API call implementation using Replicate
      setGenerationState('generating');
      
      console.log('🚀 Real AI Mode - Calling Replicate with:', {
        sourceImageId: sourceImage.id,
        prompt,
        imageCount,
        roomType: selectedRoomType,
        stagingStyle: selectedStyle
      });
      
      try {
        // Call real AI generation API
        const response = await fetch(`/api/images/${sourceImage.id}/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomType: selectedRoomType,
            stagingStyle: selectedStyle,
            prompt: prompt,
            imageCount: imageCount // Send count directly for real API
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Convert generated AI images to display format
          const newGenerations = data.data.generations.map((gen: Generation) => ({
            id: gen.id,
            url: `/api/generations/${gen.id}/file`
          }));
          
          // Add new generations to existing ones
          setGeneratedImages(prev => [...prev, ...newGenerations]);
          setGenerationState('results');
          
          // ✅ Invalidate TanStack Query cache to update badge status
          invalidateImageQueries.invalidateAll();
          invalidateProjectQueries.invalidateAll();
          
          console.log(`✅ Successfully generated ${newGenerations.length} AI variants`);
        } else {
          console.error('❌ AI generation failed:', data.message);
          setGenerationState('form');
          alert(`AI Generation failed: ${data.message}`);
        }
      } catch (error) {
        console.error('❌ Error calling real AI API:', error);
        setGenerationState('form');
        alert(`AI Generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
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
          />
        )}
        {generationState === 'generating' && <GeneratingView sourceImage={sourceImage} />}
        {generationState === 'results' && (
          <GenerationResultsView 
            sourceImage={sourceImage}
            generatedImages={generatedImages}
            onRegenerate={handleGenerate}
            onDeleteVariant={handleDeleteVariant}
            onUpdateSelections={(roomType, furnitureStyle) => {
              setSelectedRoomType(roomType);
              setSelectedStyle(furnitureStyle);
            }}
            roomType={selectedRoomType}
            furnitureStyle={selectedStyle}
            defaultVariantCount={lastVariantCount}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
