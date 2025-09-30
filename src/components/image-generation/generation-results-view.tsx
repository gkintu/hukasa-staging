import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Download, Trash2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { SourceImage, MockGeneratedImage, roomTypes, interiorStyles, convertRoomTypeFromEnum, convertStyleFromEnum } from "./types";

interface GenerationData {
  id: string;
  roomType: string;
  stagingStyle: string;
  variationIndex: number;
}
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog";
import { buildStagingPrompt } from "@/lib/ai-prompt-builder";

interface GenerationResultsViewProps {
    sourceImage: SourceImage;
    generatedImages: MockGeneratedImage[];
    generationsData?: GenerationData[];
    onRegenerate: (variantCount: number, prompt: string, roomType?: string, furnitureStyle?: string) => void;
    onDeleteVariant?: (variantId: string) => Promise<void>;
    onUpdateSelections?: (roomType: string, furnitureStyle: string) => void;
    roomType: string;
    furnitureStyle: string;
    defaultVariantCount?: number;
    isGenerating?: boolean;
}

export function GenerationResultsView({
  sourceImage,
  generatedImages,
  generationsData = [],
  onRegenerate,
  onDeleteVariant,
  onUpdateSelections,
  roomType,
  furnitureStyle,
  defaultVariantCount = 3,
  isGenerating = false
}: GenerationResultsViewProps) {
  const [selectedThumbnail, setSelectedThumbnail] = useState(0)
  const [imageCount, setImageCount] = useState([defaultVariantCount])
  
  const [currentRoomType, setCurrentRoomType] = useState(roomType)
  const [currentFurnitureStyle, setCurrentFurnitureStyle] = useState(furnitureStyle)
  
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentResult = generatedImages[selectedThumbnail]?.url;
  const originalImageUrl = sourceImage.signedUrl;

  const handleDownload = () => {
    if (!currentResult) return;
    
    // Create download link using existing API endpoint with download=true
    const downloadUrl = `${currentResult}?download=true`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.click();
  };

  const handleDownloadOriginal = () => {
    if (!originalImageUrl) return;
    // Create download link for original image
    const downloadUrl = `${originalImageUrl}?download=true`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.click();
  };

  const handleDeleteVariant = () => {
    const currentVariant = generatedImages[selectedThumbnail];
    if (!currentVariant || !onDeleteVariant) return;
    
    // Open professional delete dialog
    setDeleteVariantId(currentVariant.id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteVariantId || !onDeleteVariant) return;

    setIsDeleting(true);
    try {
      // 🔥 FIX: Await the parent deletion to ensure state is updated
      // Following TanStack Query best practices - await parent state changes
      await onDeleteVariant(deleteVariantId);

      // 🔥 FIX: Adjust selected thumbnail AFTER deletion is complete
      // This ensures we're working with the updated generatedImages array
      // Find the current index of the deleted item
      const deletedIndex = generatedImages.findIndex(img => img.id === deleteVariantId);

      if (deletedIndex !== -1) {
        // If we're deleting the currently selected thumbnail
        if (deletedIndex === selectedThumbnail) {
          // If there will be images after deletion (array length > 1)
          if (generatedImages.length > 1) {
            // If this is the last image, select the previous one
            if (deletedIndex === generatedImages.length - 1) {
              setSelectedThumbnail(Math.max(0, deletedIndex - 1));
            }
            // Otherwise keep the same index (next image will slide into this position)
          } else {
            // This was the only image, reset to 0
            setSelectedThumbnail(0);
          }
        }
        // If we're deleting an image before the selected one, adjust index down
        else if (deletedIndex < selectedThumbnail) {
          setSelectedThumbnail(selectedThumbnail - 1);
        }
        // If deleting after selected, no adjustment needed
      }
    } finally {
      setIsDeleting(false);
      setDeleteVariantId(null);
    }
  };

  const handleCloseDelete = () => {
    if (!isDeleting) {
      setDeleteVariantId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar - Controls */}
        <div className="lg:col-span-1 space-y-6 lg:max-h-[800px]">
          <div className="bg-card rounded-lg border p-6 space-y-6 h-full">
            <div>
              <h3 className="text-lg font-medium mb-4">Original</h3>
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-6 relative group">
                {originalImageUrl ? (
                  <>
                    <img
                      src={originalImageUrl}
                      alt="Original room"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" aria-label="Download original image" onClick={handleDownloadOriginal}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-muted-foreground">Loading image...</div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Room type</Label>
                <Select value={currentRoomType} onValueChange={setCurrentRoomType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map(rt => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Furniture style</Label>
                <Select value={currentFurnitureStyle} onValueChange={setCurrentFurnitureStyle}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interiorStyles.map(is => <SelectItem key={is} value={is}>{is}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <div className="space-y-3">
                <Label className="text-sm font-medium mb-3 block">Number of variants</Label>
                <Slider
                  value={imageCount}
                  onValueChange={setImageCount}
                  max={4}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {imageCount[0]} variant{imageCount[0] !== 1 ? "s" : ""} selected
                </p>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => {
                  const prompt = buildStagingPrompt({
                    roomType: currentRoomType,
                    interiorStyle: currentFurnitureStyle
                  });
                  // Update parent state to persist selections
                  onUpdateSelections?.(currentRoomType, currentFurnitureStyle);
                  // Pass the current selections directly to ensure they're used
                  onRegenerate(imageCount[0], prompt, currentRoomType, currentFurnitureStyle);
                }}
                disabled={isGenerating}
              >
                <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : `Generate ${imageCount[0]} more`}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Content - Results */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Result ({generationsData[selectedThumbnail] ?
                `${convertStyleFromEnum(generationsData[selectedThumbnail].stagingStyle)}, ${convertRoomTypeFromEnum(generationsData[selectedThumbnail].roomType)}` :
                `${currentFurnitureStyle}, ${currentRoomType}`
              })
            </h2>

            {/* Main Result */}
            <div className="bg-card rounded-lg border overflow-hidden mb-6">
              <div className="aspect-video relative group">
                <img
                  src={currentResult}
                  alt={generationsData[selectedThumbnail] ?
                    `Staged variation — ${convertStyleFromEnum(generationsData[selectedThumbnail].stagingStyle)} ${convertRoomTypeFromEnum(generationsData[selectedThumbnail].roomType)}` :
                    `Staged variation — ${currentFurnitureStyle} ${currentRoomType}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                  <div className="bg-black/20 text-white px-3 py-1 rounded text-sm inline-block">
                    {generationsData[selectedThumbnail] ?
                      `Variant ${generationsData[selectedThumbnail].variationIndex} • ${convertStyleFromEnum(generationsData[selectedThumbnail].stagingStyle)} • ${convertRoomTypeFromEnum(generationsData[selectedThumbnail].roomType)}` :
                      `${currentFurnitureStyle} • ${currentRoomType}`
                    }
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" aria-label="Download image" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" aria-label="Delete variant" onClick={handleDeleteVariant}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="secondary" size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                  onClick={() => setSelectedThumbnail((p) => (p > 0 ? p - 1 : generatedImages.length - 1))}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary" size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                  onClick={() => setSelectedThumbnail((p) => (p < generatedImages.length - 1 ? p + 1 : 0))}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Variant Thumbnails */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">All Variants</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {generatedImages.map((thumbnail, index) => (
                  <button
                    key={thumbnail.id}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-colors ${
                      index === selectedThumbnail ? "border-primary" : "border-transparent hover:border-primary"
                    }`}
                    onClick={() => setSelectedThumbnail(index)}
                    aria-label={`View room variation ${index + 1}`}
                  >
                    <img
                      src={thumbnail.url}
                      alt={`Room variation ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deleteVariantId}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        context="main"
        title="Delete Variant"
        itemName="variant"
        isLoading={isDeleting}
      />
    </div>
  )
}
