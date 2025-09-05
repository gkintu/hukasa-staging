"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { SourceImage, MockGeneratedImage, mockGeneratedImages, convertRoomTypeFromEnum, convertStyleFromEnum } from "./types"
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
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  
  // TanStack Query invalidation hooks
  const invalidateImageQueries = useInvalidateImageQueries()
  const invalidateProjectQueries = useInvalidateProjectQueries()

  // Fetch existing generations when modal opens
  useEffect(() => {
    if (isOpen && sourceImage) {
      fetchExistingGenerations();
    }
  }, [isOpen, sourceImage]);

  const fetchExistingGenerations = async () => {
    if (!sourceImage) return;
    
    setIsLoadingExisting(true);
    try {
      const response = await fetch(`/api/images/${sourceImage.id}/generations`);
      const data = await response.json();
      
      if (data.success && data.data.generations.length > 0) {
        // Convert database generations to MockGeneratedImage format
        const convertedImages = data.data.generations.map((gen: any) => ({
          id: gen.id,
          url: gen.stagedImagePath
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
    } finally {
      setIsLoadingExisting(false);
    }
  };

  if (!sourceImage) return null

  const handleGenerate = async () => {
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
            mockGenerations: mockGeneratedImages
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Convert saved generations back to MockGeneratedImage format
          const newGenerations = data.data.generations.map((gen: any) => ({
            id: gen.id,
            url: gen.stagedImagePath
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
          setGeneratedImages(prev => [...prev, ...mockGeneratedImages]);
          setGenerationState('results');
        }, 2000);
      }
    } else {
      // Placeholder for real API call
      console.log("Generating staging variants:", {
        roomType: selectedRoomType,
        style: selectedStyle,
        imageUrl: sourceImage.originalImagePath,
      })
      // On real API success, you would call setGeneratedImages and setGenerationState('results')
    }
  }

  const handleRegenerate = () => {
    setGenerationState('form');
    // Don't clear existing images - we want additive behavior
  }
  
  const handleClose = () => {
    onClose();
    // Delay resetting state to avoid UI flicker during closing animation
    setTimeout(() => {
        handleRegenerate();
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
          />
        )}
        {generationState === 'generating' && <GeneratingView sourceImage={sourceImage} />}
        {generationState === 'results' && (
          <GenerationResultsView 
            sourceImage={sourceImage}
            generatedImages={generatedImages}
            onRegenerate={handleRegenerate}
            roomType={selectedRoomType}
            furnitureStyle={selectedStyle}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
