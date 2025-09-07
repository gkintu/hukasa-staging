import React, { useState } from "react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, ChevronDown, Home, Palette } from "lucide-react";
import { SourceImage, roomTypes, interiorStyles } from "./types";
import { buildStagingPrompt } from "@/lib/ai-prompt-builder";

interface GenerationFormProps {
    sourceImage: SourceImage;
    onClose: () => void;
    onGenerate: (imageCount: number, prompt: string) => void;
    selectedRoomType: string;
    setSelectedRoomType: (value: string) => void;
    selectedStyle: string;
    setSelectedStyle: (value: string) => void;
    previousVariantCount?: number;
    autoExpandAdvanced?: boolean;
}

export function GenerationForm({ 
    sourceImage, 
    onClose, 
    onGenerate, 
    selectedRoomType, 
    setSelectedRoomType, 
    selectedStyle, 
    setSelectedStyle,
    previousVariantCount = 3,
    autoExpandAdvanced = false
}: GenerationFormProps) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(autoExpandAdvanced)
    const [imageCount, setImageCount] = useState([previousVariantCount])
    const isGenerateDisabled = !selectedRoomType || !selectedStyle

    return (
        <div className="relative">
            <div className="bg-muted/30 px-8 py-6 border-b border-border">
                <DialogHeader className="space-y-0">
                <DialogTitle className="text-lg font-semibold">Generate Staging Variants</DialogTitle>
                </DialogHeader>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 max-h-[calc(95vh-120px)] overflow-y-auto">
                {/* Left Column: Image */}
                <div className="relative group">
                    <div className="relative overflow-hidden rounded-xl shadow-lg border border-border">
                        <img
                            src={`/api/files/${sourceImage.originalImagePath.split('/').pop()?.split('.')[0]}`}
                            alt={sourceImage.displayName || sourceImage.originalFileName}
                            className="w-full h-96 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </div>
                </div>

                {/* Right Column: Form */}
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label htmlFor="room-type" className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Home className="w-4 h-4 text-accent" />
                                Room Type
                            </Label>
                            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                                <SelectTrigger id="room-type" className="h-12 bg-background border-border hover:border-accent/50 transition-colors">
                                    <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border">
                                    {roomTypes.map((type) => (
                                        <SelectItem key={type} value={type} className="hover:bg-accent/10">{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="interior-style" className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Palette className="w-4 h-4 text-accent" />
                                Interior Style
                            </Label>
                            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                                <SelectTrigger id="interior-style" className="h-12 bg-background border-border hover:border-accent/50 transition-colors">
                                    <SelectValue placeholder="Select interior style" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border">
                                    {interiorStyles.map((style) => (
                                        <SelectItem key={style} value={style} className="hover:bg-accent/10">{style}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full h-12 px-4 text-left bg-background border border-border rounded-lg hover:border-accent/50 transition-colors">
                            <span className="text-sm font-semibold text-foreground">Advanced Options</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-2">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-foreground">Number of variants</Label>
                                <Slider value={imageCount} onValueChange={setImageCount} max={4} min={1} step={1} className="w-full" />
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
                            <Button variant="outline" onClick={onClose} className="px-6 hover:bg-muted/70 hover:text-foreground cursor-pointer">
                                Cancel
                            </Button>
                            <Button onClick={() => {
                                const prompt = buildStagingPrompt({ 
                                    roomType: selectedRoomType, 
                                    interiorStyle: selectedStyle 
                                });
                                onGenerate(imageCount[0], prompt);
                            }} disabled={isGenerateDisabled} className="px-6 cursor-pointer">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}