"use client"

import { useQuery } from "@tanstack/react-query"
import { useState, useEffect } from "react"

interface AnnouncementData {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isActive: boolean
  icon?: string
}

const CACHE_KEY = 'announcements-cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function fetchAnnouncements(): Promise<AnnouncementData | null> {
  // Check session storage first (F5 refresh protection)
  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data
    }
  }

  const response = await fetch('/api/announcements')
  if (!response.ok) {
    throw new Error('Failed to fetch announcements')
  }

  const result = await response.json()
  const announcement = result.success && result.data ? result.data : null

  // Cache in session storage
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({
    data: announcement,
    timestamp: Date.now()
  }))

  return announcement
}

export function useAnnouncements() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Load dismissed announcements from localStorage
  useEffect(() => {
    const dismissed = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('announcement-dismissed-') && localStorage.getItem(key) === 'true') {
        const id = key.replace('announcement-dismissed-', '')
        dismissed.add(id)
      }
    }
    setDismissedIds(dismissed)
  }, [])

  const query = useQuery({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const announcement = query.data
  const isVisible = announcement?.isActive && !dismissedIds.has(announcement.id)

  const dismissAnnouncement = (id: string) => {
    localStorage.setItem(`announcement-dismissed-${id}`, 'true')
    setDismissedIds(prev => new Set(prev).add(id))
  }

  return {
    announcement: isVisible ? announcement : null,
    isLoading: query.isLoading,
    isError: query.isError,
    dismissAnnouncement,
  }
}