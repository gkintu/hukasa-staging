"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface BeforeAfterSlide {
  before: string
  after: string
  alt: string
}

const slides: BeforeAfterSlide[] = [
  {
    before: "/carousel/empty-room-before.jpg",
    after: "/carousel/ai-furnished-room-after.jpg",
    alt: "Living room transformation",
  },
  {
    before: "/carousel/bare-bedroom-before.jpg",
    after: "/carousel/ai-designed-bedroom-after.jpg",
    alt: "Bedroom transformation",
  },
  {
    before: "/carousel/empty-kitchen-before.jpg",
    after: "/carousel/ai-modern-kitchen-after.jpg",
    alt: "Kitchen transformation",
  },
  {
    before: "/carousel/plain-office-before.jpg",
    after: "/carousel/ai-stylish-office-after.jpg",
    alt: "Office transformation",
  },
]

const fadeSpring = {
  type: "spring" as const,
  stiffness: 150, // How fast it snaps
  damping: 20, // How much it overshoots and settles
  mass: 1,
}

const DOT_ACTIVE_WIDTH = 24 // Tailwind w-6
const DOT_INACTIVE_WIDTH = 16 // Tailwind w-4
const DOT_GAP = 8 // Tailwind gap-2

export function BeforeAfterCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const indicatorRef = React.useRef<HTMLDivElement | null>(null)
  const [indicatorWidth, setIndicatorWidth] = React.useState(0)

  // Auto-play functionality - advance every 5 seconds
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 4000)

    return () => clearInterval(intervalId)
  }, [])

  React.useEffect(() => {
    const indicatorNode = indicatorRef.current
    if (!indicatorNode) {
      return
    }

    const updateWidth = () => {
      setIndicatorWidth(indicatorNode.offsetWidth)
    }

    updateWidth()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIndicatorWidth(entry.contentRect.width)
      }
    })

    observer.observe(indicatorNode)

    return () => observer.disconnect()
  }, [])

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  const fallbackIndicatorWidth =
    DOT_ACTIVE_WIDTH + (slides.length - 1) * (DOT_INACTIVE_WIDTH + DOT_GAP)

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4">
      <Card className="relative border-0 bg-card p-8 rounded-lg shadow-2xl overflow-hidden">
        {/* Main carousel container with fixed aspect ratio */}
        <div
          className="relative w-full aspect-video"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Slides with cross-fade animation */}
          <AnimatePresence>
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeSpring}
              className="absolute inset-0"
            >
              <div className="grid md:grid-cols-2 gap-6 h-full">
                {/* Before Image */}
                <div className="space-y-3 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">BEFORE</span>
                  </div>
                  <div className="relative flex-1 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={slides[activeIndex].before}
                      alt={`${slides[activeIndex].alt} - Before`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute left-4 bottom-4 rounded-md bg-foreground/10 px-3 py-2 shadow-sm">
                      <div ref={indicatorRef} className="flex justify-center gap-2">
                        {slides.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`h-4 rounded-md transition-all duration-300 ${
                              activeIndex === index
                                ? "w-6 bg-foreground/70"
                                : "w-4 bg-foreground/30 hover:bg-foreground/60"
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* After Image */}
                <div className="space-y-3 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary uppercase tracking-wider">AFTER</span>
                  </div>
                  <div className="relative flex-1 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={slides[activeIndex].after}
                      alt={`${slides[activeIndex].alt} - After`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute left-4 bottom-4 rounded-md bg-foreground/10 px-3 py-2 shadow-sm">
                      <div
                        className="h-4 overflow-hidden rounded-md bg-foreground/20"
                        style={{
                          width: `${indicatorWidth || fallbackIndicatorWidth}px`,
                        }}
                      >
                        <AnimatePresence>
                          <motion.div
                            key={activeIndex}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4, ease: "linear" }}
                            className="h-full rounded-md bg-foreground/60"
                          />
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons - fade in on hover */}
          <motion.button
            onClick={goToPrevious}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-primary/90 hover:bg-primary shadow-lg flex items-center justify-center transition-colors z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6 text-primary-foreground" />
          </motion.button>

          <motion.button
            onClick={goToNext}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-primary/90 hover:bg-primary shadow-lg flex items-center justify-center transition-colors z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6 text-primary-foreground" />
          </motion.button>

        </div>
      </Card>
    </div>
  )
}
