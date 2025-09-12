import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Download, Trash2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { SourceImage, MockGeneratedImage, roomTypes, interiorStyles } from "./types";
import { DeleteConfirmationDialog } from "@/components/shared/delete-confirmation-dialog";
import { buildStagingPrompt } from "@/lib/ai-prompt-builder";

interface GenerationResultsViewProps {
    sourceImage: SourceImage;
    generatedImages: MockGeneratedImage[];
    onRegenerate: (variantCount: number, prompt: string) => void;
    onDeleteVariant?: (variantId: string) => void;
    onUpdateSelections?: (roomType: string, furnitureStyle: string) => void;
    roomType: string;
    furnitureStyle: string;
    defaultVariantCount?: number;
}

export function GenerationResultsView({ 
  sourceImage, 
  generatedImages, 
  onRegenerate, 
  onDeleteVariant,
  onUpdateSelections,
  roomType, 
  furnitureStyle, 
  defaultVariantCount = 3 
}: GenerationResultsViewProps) {
  const [selectedThumbnail, setSelectedThumbnail] = useState(0)
  const [imageCount, setImageCount] = useState([defaultVariantCount])
  
  const [currentRoomType, setCurrentRoomType] = useState(roomType)
  const [currentFurnitureStyle, setCurrentFurnitureStyle] = useState(furnitureStyle)
  
  const [deleteVariantId, setDeleteVariantId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentResult = generatedImages[selectedThumbnail]?.url;
  const originalImageUrl = `/api/images/${sourceImage.id}/file`;

  const handleDownload = () => {
    if (!currentResult) return;
    
    // Create download link using existing API endpoint with download=true
    const downloadUrl = `${currentResult}?download=true`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.click();
  };

  const handleDownloadOriginal = () => {
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
      onDeleteVariant(deleteVariantId);
      
      // Adjust selected thumbnail if needed
      if (selectedThumbnail >= generatedImages.length - 1) {
        setSelectedThumbnail(Math.max(0, generatedImages.length - 2));
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
    <div className="p-2 sm:p-4 md:p-6">
        <Card className="border-none shadow-none p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Original</h2>
              <div className="relative mb-4 group rounded-lg overflow-hidden border border-border">
                <img
                  src={originalImageUrl}
                  alt="Original room"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" aria-label="Download original image" onClick={handleDownloadOriginal}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium mb-2 text-foreground">Room type</Label>
                  <Select value={currentRoomType} onValueChange={setCurrentRoomType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(rt => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-2 text-foreground">Furniture style</Label>
                  <Select value={currentFurnitureStyle} onValueChange={setCurrentFurnitureStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {interiorStyles.map(is => <SelectItem key={is} value={is}>{is}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-border/20">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Number of variants</Label>
                    <Slider 
                      value={imageCount} 
                      onValueChange={setImageCount} 
                      max={4} 
                      min={1} 
                      step={1} 
                      className="w-full" 
                    />
                    <div className="text-center text-sm text-muted-foreground">
                      {imageCount[0]} variant{imageCount[0] !== 1 ? "s" : ""} selected
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      const prompt = buildStagingPrompt({ 
                        roomType: currentRoomType, 
                        interiorStyle: currentFurnitureStyle 
                      });
                      // Update parent state to persist selections
                      onUpdateSelections?.(currentRoomType, currentFurnitureStyle);
                      onRegenerate(imageCount[0], prompt);
                    }} 
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate {imageCount[0]} more
                  </Button>
                </div>
                
              </div>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-3">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Result ({currentFurnitureStyle}, {currentRoomType})
              </h2>
              <div className="relative mb-4 group rounded-lg overflow-hidden border border-border">
                <img
                  src={currentResult}
                  alt={`Staged variation — ${currentFurnitureStyle} ${currentRoomType}`}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-white text-xs font-mono">{currentFurnitureStyle} • {currentRoomType}</p>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" aria-label="Download image" onClick={handleDownload}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="secondary" aria-label="Delete variant" onClick={handleDeleteVariant}><Trash2 className="h-4 w-4" /></Button>
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
              <div className="flex gap-2 overflow-x-auto pb-2">
                {generatedImages.map((thumbnail, index) => (
                  <button
                    key={thumbnail.id}
                    className={`flex-shrink-0 rounded-md overflow-hidden border-2 ${index === selectedThumbnail ? "border-accent" : "border-transparent"} hover:border-accent/70`}
                    onClick={() => setSelectedThumbnail(index)}
                    aria-label={`View room variation ${index + 1}`}
                  >
                    <img
                      src={thumbnail.url}
                      alt={`Room variation ${index + 1}`}
                      className="w-20 h-14 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

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
