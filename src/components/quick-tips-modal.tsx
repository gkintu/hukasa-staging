"use client"

import { useState } from "react"
import { Clock, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface QuickTipsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToHelp?: () => void
}

interface Chapter {
  time: string
  title: string
}

const gettingStartedChapters: Chapter[] = [
  { time: "00:00", title: "Upload your first image" },
  { time: "00:15", title: "Choose or create a project" },
  { time: "00:30", title: "Generate variants" },
  { time: "00:45", title: "Download and use results" },
]

const proTipsChapters: Chapter[] = [
  { time: "00:00", title: "Best photo quality tips" },
  { time: "00:15", title: "Organizing with projects" },
  { time: "00:30", title: "Managing variants" },
  { time: "00:35", title: "Batch operations" },
]

export function QuickTipsModal({ open, onOpenChange, onNavigateToHelp }: QuickTipsModalProps) {
  const [isProTipsExpanded, setIsProTipsExpanded] = useState(false)

  const handleHelpClick = () => {
    onOpenChange(false)
    onNavigateToHelp?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Quick Tips - Get Started Fast
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-8rem)] overflow-y-auto">
          {/* Getting Started Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Getting Started</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>60s</span>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">Video: Getting Started</p>
                  <p className="text-xs text-muted-foreground">(Embed your video URL here)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {gettingStartedChapters.map((chapter, index) => (
                <button
                  key={index}
                  type="button"
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                >
                  <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">{chapter.time}</span>
                  <span className="text-sm text-foreground group-hover:text-foreground/80">{chapter.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pro Tips Section */}
          <div className="border-t border-border pt-6">
            <button
              type="button"
              onClick={() => setIsProTipsExpanded(!isProTipsExpanded)}
              className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <h3 className="text-base font-semibold text-foreground">Pro Tips & Advanced Features</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>45s</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${isProTipsExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {isProTipsExpanded && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">Video: Pro Tips & Advanced Features</p>
                      <p className="text-xs text-muted-foreground">(Embed your video URL here)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {proTipsChapters.map((chapter, index) => (
                    <button
                      key={index}
                      type="button"
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                    >
                      <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">{chapter.time}</span>
                      <span className="text-sm text-foreground group-hover:text-foreground/80">{chapter.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <p className="text-sm text-center text-muted-foreground">
            Need more help? Visit our{" "}
            <button
              type="button"
              onClick={handleHelpClick}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Help Center
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
