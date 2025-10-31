"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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

const DOT_ACTIVE_WIDTH = 14 // Tailwind w-3.5
const DOT_INACTIVE_WIDTH = 10 // Tailwind w-2.5
const DOT_GAP = 6 // Tailwind gap-1.5
const AUTO_PLAY_INTERVAL_MS = 3000
const PROGRESS_DURATION_S = AUTO_PLAY_INTERVAL_MS / 1000

export function BeforeAfterCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const indicatorRef = React.useRef<HTMLDivElement | null>(null)
  const [indicatorWidth, setIndicatorWidth] = React.useState(0)

  // Auto-play functionality - advance every 3 seconds
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, AUTO_PLAY_INTERVAL_MS)

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
    <div className="w-full max-w-none mx-auto px-px py-px sm:px-1 sm:py-1">
      <Card className="relative border-0 bg-card p-2 pb-4 sm:p-5 rounded-lg shadow-2xl overflow-hidden">
        {/* Main carousel container with fixed aspect ratio */}
        <div
          className="relative w-full aspect-[8/3]"
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
              <div className="grid grid-cols-2 gap-4 md:gap-6 h-full">
                {/* Before Image */}
                <div className="flex flex-col">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                    <div className="absolute left-3 top-3 sm:left-4 sm:top-4 rounded-md bg-foreground/40 sm:bg-foreground/50 px-2 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs font-bold tracking-wider text-background/80 shadow-sm uppercase z-10">
                      BEFORE
                    </div>
                    <img
                      src={slides[activeIndex].before}
                      alt={`${slides[activeIndex].alt} - Before`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute left-4 bottom-4 rounded-md bg-white/20 dark:bg-white/15 px-3 py-2 shadow-sm">
                      <div ref={indicatorRef} className="flex justify-center gap-1.5 sm:gap-2">
                        {slides.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`h-3 sm:h-4 rounded-md transition-all duration-300 ${
                              activeIndex === index
                                ? "w-3.5 sm:w-6 bg-foreground/80 dark:bg-foreground/70"
                                : "w-2.5 sm:w-4 bg-foreground/30 hover:bg-foreground/60"
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* After Image */}
                <div className="flex flex-col">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                    <div className="absolute left-3 top-3 sm:left-4 sm:top-4 rounded-md bg-background/50 sm:bg-background/60 px-2 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs font-bold tracking-wider text-foreground/70 shadow-sm uppercase z-10">
                      AFTER
                    </div>
                    <img
                      src={slides[activeIndex].after}
                      alt={`${slides[activeIndex].alt} - After`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute left-4 bottom-4 rounded-md bg-white/20 dark:bg-white/15 px-3 py-2 shadow-sm">
                      <div
                        className="h-3 sm:h-4 overflow-hidden rounded-md bg-foreground/20"
                        style={{
                          width: `${indicatorWidth || fallbackIndicatorWidth}px`,
                        }}
                      >
                        <motion.div
                          key={activeIndex}
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: PROGRESS_DURATION_S, ease: "linear" }}
                          className="h-full rounded-md bg-foreground/80"
                        />
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

        {/* CTA Buttons */}
        <div className="mt-2 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="text-base md:text-lg px-10 md:px-8 py-4 md:py-5" asChild>
            <Link href="/generate">
             Start Now
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base md:text-lg px-6 md:px-8 py-4 md:py-5 bg-transparent"
            asChild
          >
            <Link href="#gallery">
              View Examples
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
