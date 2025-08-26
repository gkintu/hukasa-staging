"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { SourceImage, MockGeneratedImage, mockGeneratedImages } from "./types"
import { GenerationForm } from "./generation-form"
import { GeneratingView } from "./generating-view"
import { GenerationResultsView } from "./generation-results-view"

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

  if (!sourceImage) return null

  const handleGenerate = () => {
    // Use NEXT_PUBLIC_MOCK_API env var to toggle mock flow
    if (process.env.NEXT_PUBLIC_MOCK_API === 'true') {
      setGenerationState('generating');
      setTimeout(() => {
        setGeneratedImages(mockGeneratedImages);
        setGenerationState('results');
      }, 2000);
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
    setGeneratedImages([]);
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
