"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react"

interface AnnouncementData {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isActive: boolean
  icon?: string
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

const buttonStyleMap = {
  info: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200",
  success: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200",
  warning: "text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200",
  error: "text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const response = await fetch('/api/announcements')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const announcementData = data.data as AnnouncementData

            // Check if user has dismissed this announcement
            const dismissedKey = `announcement-dismissed-${announcementData.id}`
            const isDismissed = localStorage.getItem(dismissedKey) === 'true'

            if (announcementData.isActive && !isDismissed) {
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

    fetchAnnouncement()
  }, [])

  const handleDismiss = () => {
    if (announcement) {
      // Store dismissal in localStorage
      const dismissedKey = `announcement-dismissed-${announcement.id}`
      localStorage.setItem(dismissedKey, 'true')
      setIsVisible(false)
    }
  }

  if (isLoading || !isVisible || !announcement) {
    return null
  }

  const IconComponent = iconMap[announcement.type]

  return (
    <Alert className={`mb-6 ${styleMap[announcement.type]}`}>
      <IconComponent className={`h-4 w-4 ${iconStyleMap[announcement.type]}`} />
      <AlertDescription className="flex items-center justify-between">
        <span className={textStyleMap[announcement.type]} dangerouslySetInnerHTML={{ __html: announcement.message }} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className={buttonStyleMap[announcement.type]}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  )
}