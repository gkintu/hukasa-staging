"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react"

interface AnnouncementData {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
}

const styleMap = {
  info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
  success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
  warning: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
  error: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
}

const textStyleMap = {
  info: "text-blue-800 dark:text-blue-200",
  success: "text-green-800 dark:text-green-200",
  warning: "text-yellow-800 dark:text-yellow-200",
  error: "text-red-800 dark:text-red-200"
}

const iconStyleMap = {
  info: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400"
}

/**
 * Announcement Banner Component
 *
 * Pipeline:
 * 1. On mount: Fetch current announcement from KV store (single fetch)
 * 2. Connect to SSE for live updates
 * 3. Check localStorage for dismissal
 * 4. Show banner if not dismissed
 * 5. On dismiss: Save to localStorage (per announcement ID)
 */
export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let eventSource: EventSource | null = null

    // Step 1: Fetch current announcement once
    async function fetchAnnouncement() {
      try {
        const response = await fetch('/api/announcements/current')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const announcementData = data.data as AnnouncementData

            // Check if user has dismissed this announcement
            const dismissedKey = `dismissed:announcement:${announcementData.id}`
            const isDismissed = localStorage.getItem(dismissedKey) === 'true'

            if (!isDismissed) {
              setAnnouncement(announcementData)
              setIsVisible(true)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch announcement:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Step 2: Connect to SSE for live updates
    async function connectSSE() {
      try {
        eventSource = new EventSource('/api/sse/auth-events')

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle announcement events
            if (data.type === 'ANNOUNCEMENT_CREATED') {
              const newAnnouncement = data.data as AnnouncementData
              const dismissedKey = `dismissed:announcement:${newAnnouncement.id}`
              const isDismissed = localStorage.getItem(dismissedKey) === 'true'

              if (!isDismissed) {
                setAnnouncement(newAnnouncement)
                setIsVisible(true)
              }
            } else if (data.type === 'ANNOUNCEMENT_REMOVED') {
              // Hide banner immediately
              setAnnouncement(null)
              setIsVisible(false)
            }
          } catch (error) {
            console.error('Failed to parse SSE message:', error)
          }
        }

        eventSource.onerror = () => {
          console.log('SSE connection closed, will reconnect...')
          eventSource?.close()
        }
      } catch (error) {
        console.error('Failed to connect to SSE:', error)
      }
    }

    fetchAnnouncement()
    connectSSE()

    // Cleanup on unmount
    return () => {
      eventSource?.close()
    }
  }, [])

  const handleDismiss = () => {
    if (announcement) {
      // Save dismissal to localStorage
      const dismissedKey = `dismissed:announcement:${announcement.id}`
      localStorage.setItem(dismissedKey, 'true')

      // Hide banner
      setIsVisible(false)
      setAnnouncement(null)
    }
  }

  // Don't render anything if loading, no announcement, or dismissed
  if (isLoading || !announcement || !isVisible) {
    return null
  }

  const Icon = iconMap[announcement.type]

  return (
    <div className="w-full">
      <Alert className={`${styleMap[announcement.type]} relative rounded-none border-x-0 border-t-0`}>
        <Icon className={`h-4 w-4 ${iconStyleMap[announcement.type]}`} />
        <AlertDescription className={`${textStyleMap[announcement.type]} pr-8`}>
          {announcement.message}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  )
}
