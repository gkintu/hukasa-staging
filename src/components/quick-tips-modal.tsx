"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { PlayCircle, ChevronDown, ChevronUp, Lightbulb, Clock } from "lucide-react"
import { useState } from "react"

interface QuickTipsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToHelp?: () => void
}

export function QuickTipsModal({ open, onOpenChange, onNavigateToHelp }: QuickTipsModalProps) {
  const [isProTipsOpen, setIsProTipsOpen] = useState(false)

  const handleHelpClick = () => {
    onOpenChange(false) // Close modal
    onNavigateToHelp?.() // Navigate to help page
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            Quick Tips - Get Started Fast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video 1: Getting Started */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Getting Started</h3>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>60s</span>
              </div>
            </div>

            {/* Video Player Placeholder */}
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
              <div className="text-center">
                <PlayCircle className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Video: Getting Started</p>
                <p className="text-xs text-muted-foreground mt-1">
                  (Embed your video URL here)
                </p>
              </div>
            </div>

            {/* Video Chapters */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                <span className="text-muted-foreground font-mono text-xs">00:00</span>
                <span>Upload your first image</span>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                <span className="text-muted-foreground font-mono text-xs">00:15</span>
                <span>Choose or create a project</span>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                <span className="text-muted-foreground font-mono text-xs">00:30</span>
                <span>Generate variants</span>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                <span className="text-muted-foreground font-mono text-xs">00:45</span>
                <span>Download and use results</span>
              </div>
            </div>
          </div>

          {/* Video 2: Pro Tips (Collapsible) */}
          <Collapsible open={isProTipsOpen} onOpenChange={setIsProTipsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Pro Tips & Advanced Features</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>45s</span>
                  </div>
                  {isProTipsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 mt-3">
              {/* Video Player Placeholder */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
                <div className="text-center">
                  <PlayCircle className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Video: Pro Tips</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Embed your video URL here)
                  </p>
                </div>
              </div>

              {/* Video Chapters */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground font-mono text-xs">00:00</span>
                  <span>Best photo quality tips</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground font-mono text-xs">00:15</span>
                  <span>Organizing with projects</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground font-mono text-xs">00:30</span>
                  <span>Managing variants</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground font-mono text-xs">00:35</span>
                  <span>Batch operations</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Footer */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Need more help? Visit our{" "}
              <button
                onClick={handleHelpClick}
                className="text-primary hover:underline cursor-pointer"
              >
                Help Center
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
