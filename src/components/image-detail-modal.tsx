"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { X, Sparkles, Wand2, ChevronDown } from "lucide-react"

interface ImageDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sourceImage: SourceImage | null
}

interface GeneratedVariant {
  id: string
  stagedImagePath: string | null
  variationIndex: number
  status: string
  completedAt: Date | null
  errorMessage: string | null
}

interface SourceImage {
  id: string
  originalImagePath: string
  originalFileName: string
  displayName: string | null
  fileSize: number | null
  roomType: string
  stagingStyle: string
  operationType: string
  createdAt: Date
  variants: GeneratedVariant[]
}

const roomTypes = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Bathroom",
  "Home Office",
  "Kids Room",
  "Master Bedroom",
]

const interiorStyles = [
  "Modern",
  "Midcentury",
  "Scandinavian",
  "Luxury",
  "Coastal",
  "Farmhouse",
  "Industrial",
  "Bohemian",
  "Minimalist",
]

export function ImageDetailModal({ isOpen, onClose, sourceImage }: ImageDetailModalProps) {
  const [selectedRoomType, setSelectedRoomType] = useState<string>("")
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [imageCount, setImageCount] = useState([4])

  if (!sourceImage) return null

  const handleGenerate = () => {
    // Placeholder for generation logic
    console.log("Generating staging variants:", {
      roomType: selectedRoomType,
      style: selectedStyle,
      imageUrl: sourceImage.originalImagePath,
      count: imageCount[0],
    })
    // Here you would trigger the actual staging generation
  }

  const isGenerateDisabled = !selectedRoomType || !selectedStyle

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden bg-background border-border p-0">
        <div className="relative">
          <div className="bg-muted/30 px-8 py-6 border-b border-border">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="bg-accent/20 p-2 rounded-lg">
                  <Wand2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    Generate Staging Variants
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">Transform your space with AI-powered staging</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
          </div>

          <div className="px-8 py-6 space-y-8 max-h-[calc(95vh-120px)] overflow-y-auto">
            {/* Enhanced Image Preview */}
            <div className="relative group">
              <div className="relative overflow-hidden rounded-xl shadow-lg border border-border">
                <img
                  src={`/api/files/${sourceImage.originalImagePath.split('/').pop()?.split('.')[0]}`}
                  alt={sourceImage.displayName || sourceImage.originalFileName}
                  className="w-full h-72 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
              {(sourceImage.displayName || sourceImage.originalFileName) && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <p className="text-sm font-medium text-foreground">{sourceImage.displayName || sourceImage.originalFileName}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Room Type Selection */}
              <div className="space-y-3">
                <Label htmlFor="room-type" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                  Room Type
                </Label>
                <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                  <SelectTrigger
                    id="room-type"
                    className="h-12 bg-background border-border hover:border-accent/50 transition-colors"
                  >
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {roomTypes.map((type) => (
                      <SelectItem key={type} value={type} className="hover:bg-accent/10">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interior Style Selection */}
              <div className="space-y-3">
                <Label
                  htmlFor="interior-style"
                  className="text-sm font-semibold text-foreground flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
                  Interior Style
                </Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger
                    id="interior-style"
                    className="h-12 bg-background border-border hover:border-accent/50 transition-colors"
                  >
                    <SelectValue placeholder="Select interior style" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {interiorStyles.map((style) => (
                      <SelectItem key={style} value={style} className="hover:bg-accent/10">
                        {style}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-left">
                <span className="text-sm font-semibold text-foreground">Advanced Options</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
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
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center justify-between pt-4 border-t border-border/20">
              <span className="text-sm text-muted-foreground">
                {imageCount[0]} variant{imageCount[0] !== 1 ? "s" : ""} will be generated
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="px-6 bg-transparent">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className="px-6 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}