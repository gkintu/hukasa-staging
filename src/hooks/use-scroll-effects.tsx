"use client"

import * as React from "react"

interface ScrollPosition {
  x: number
  y: number
}

interface ScrollDirection {
  x: 'left' | 'right' | null
  y: 'up' | 'down' | null
}

export function useScrollPosition(): ScrollPosition {
  const [scrollPosition, setScrollPosition] = React.useState<ScrollPosition>({
    x: 0,
    y: 0
  })

  React.useEffect(() => {
    const updatePosition = () => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset
      })
    }

    window.addEventListener('scroll', updatePosition, { passive: true })
    updatePosition()

    return () => window.removeEventListener('scroll', updatePosition)
  }, [])

  return scrollPosition
}

export function useScrollDirection(): ScrollDirection & { 
  isScrollingUp: boolean
  isScrollingDown: boolean
  scrollY: number
} {
  const [scrollDirection, setScrollDirection] = React.useState<ScrollDirection>({
    x: null,
    y: null
  })
  const [scrollY, setScrollY] = React.useState(0)
  const [lastScrollY, setLastScrollY] = React.useState(0)
  const [lastScrollX, setLastScrollX] = React.useState(0)

  React.useEffect(() => {
    let ticking = false

    const updateScrollDirection = () => {
      const currentScrollY = window.pageYOffset
      const currentScrollX = window.pageXOffset

      setScrollDirection(() => ({
        x: currentScrollX > lastScrollX ? 'right' : currentScrollX < lastScrollX ? 'left' : null,
        y: currentScrollY > lastScrollY ? 'down' : currentScrollY < lastScrollY ? 'up' : null
      }))

      setScrollY(currentScrollY)
      setLastScrollY(currentScrollY)
      setLastScrollX(currentScrollX)
      ticking = false
    }

    const requestTick = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection)
        ticking = true
      }
    }

    const handleScroll = () => requestTick()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, lastScrollX])

  return {
    ...scrollDirection,
    isScrollingUp: scrollDirection.y === 'up',
    isScrollingDown: scrollDirection.y === 'down',
    scrollY
  }
}

export function useScrollHidden(threshold = 100) {
  const { isScrollingDown, isScrollingUp, scrollY } = useScrollDirection()
  const [isHidden, setIsHidden] = React.useState(false)

  React.useEffect(() => {
    if (scrollY < threshold) {
      setIsHidden(false)
      return
    }

    if (isScrollingDown) {
      setIsHidden(true)
    } else if (isScrollingUp) {
      setIsHidden(false)
    }
  }, [isScrollingDown, isScrollingUp, scrollY, threshold])

  return {
    isHidden,
    scrollY,
    isScrollingUp,
    isScrollingDown
  }
}

export function useScrollOpacity(fadeStart = 50, fadeEnd = 150) {
  const { y: scrollY } = useScrollPosition()
  
  const opacity = React.useMemo(() => {
    if (scrollY <= fadeStart) return 1
    if (scrollY >= fadeEnd) return 0
    
    return 1 - ((scrollY - fadeStart) / (fadeEnd - fadeStart))
  }, [scrollY, fadeStart, fadeEnd])

  return opacity
}

export function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = React.useState(0)

  React.useEffect(() => {
    const calculateScrollProgress = () => {
      const scrollTop = window.pageYOffset
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0
      
      setScrollProgress(Math.min(100, Math.max(0, progress)))
    }

    window.addEventListener('scroll', calculateScrollProgress, { passive: true })
    calculateScrollProgress()

    return () => window.removeEventListener('scroll', calculateScrollProgress)
  }, [])

  return scrollProgress
}