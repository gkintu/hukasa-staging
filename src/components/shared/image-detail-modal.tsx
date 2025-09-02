"use client"

import { useState } from "react"
import { BaseModal } from "./base-modal"
import { GenerationForm } from "../image-detail-modal/generation-form"
import { GeneratingView } from "../image-detail-modal/generating-view" 
import { GenerationResultsView } from "../image-detail-modal/generation-results-view"
import { MockGeneratedImage, mockGeneratedImages } from "../image-detail-modal/types"
import type { BasicImage } from "@/lib/shared/schemas/image-schemas"

interface SharedImageDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sourceImage: BasicImage | null
  context?: 'main' | 'admin'
}

export function SharedImageDetailModal({ 
  isOpen, 
  onClose, 
  sourceImage,
  context = 'main'
}: SharedImageDetailModalProps) {
  const [generationState, setGenerationState] = useState<'form' | 'generating' | 'results'>('form');
  const [generatedImages, setGeneratedImages] = useState<MockGeneratedImage[]>([]);
  
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")

  if (!sourceImage) return null

  // Convert BasicImage to SourceImage format for compatibility
  const compatibleSourceImage = {
    id: sourceImage.id,
    originalImagePath: sourceImage.originalImagePath,
    originalFileName: sourceImage.originalFileName, 
    displayName: sourceImage.displayName,
    fileSize: sourceImage.fileSize,
    roomType: sourceImage.roomType || '',
    stagingStyle: sourceImage.stagingStyle || '',
    operationType: sourceImage.operationType || '',
    createdAt: new Date(sourceImage.createdAt),
    variants: sourceImage.variants || []
  }

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
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      context={context}
      className="max-h-[95vh] overflow-hidden bg-background border-border p-0"
    >
      {generationState === 'form' && (
        <GenerationForm 
          sourceImage={compatibleSourceImage}
          onClose={handleClose}
          onGenerate={handleGenerate}
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
        />
      )}
      {generationState === 'generating' && <GeneratingView sourceImage={compatibleSourceImage} />}
      {generationState === 'results' && (
        <GenerationResultsView 
          sourceImage={compatibleSourceImage}
          generatedImages={generatedImages}
          onRegenerate={handleRegenerate}
          roomType={selectedRoomType}
          furnitureStyle={selectedStyle}
        />
      )}
    </BaseModal>
  )
}