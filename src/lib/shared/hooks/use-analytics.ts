import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

// Analytics Event Types
export interface AnalyticsEvent {
  id: string
  type: 'search' | 'navigation' | 'bulk_operation' | 'upload' | 'download' | 'delete' | 'create' | 'edit' | 'view' | 'error'
  action: string
  context: 'main' | 'admin'
  userId?: string
  sessionId: string
  timestamp: Date
  metadata?: {
    query?: string
    searchResultCount?: number
    selectedItems?: number
    operationType?: string
    errorMessage?: string
    performanceMs?: number
    fromPage?: string
    toPage?: string
    itemId?: string
    itemType?: string
    bulkActionType?: string
    [key: string]: unknown
  }
}

export interface AnalyticsInsight {
  popularSearches: { query: string; count: number; avgResultCount: number }[]
  commonNavigation: { from: string; to: string; count: number }[]
  bulkOperationUsage: { action: string; count: number; avgItems: number; successRate: number }[]
  errorPatterns: { error: string; count: number; context: string }[]
  performanceMetrics: {
    avgSearchTime: number
    avgBulkOperationTime: number
    slowestOperations: { action: string; avgTime: number }[]
  }
  userBehavior: {
    sessionDuration: number
    pagesPerSession: number
    mostVisitedPages: { page: string; count: number }[]
    timeOfDayDistribution: { hour: number; count: number }[]
  }
}

interface AnalyticsState {
  events: AnalyticsEvent[]
  sessionId: string
  sessionStartTime: Date
  isEnabled: boolean
  
  // Actions
  trackEvent: (event: Omit<AnalyticsEvent, 'id' | 'sessionId' | 'timestamp'>) => void
  setEnabled: (enabled: boolean) => void
  clearEvents: (olderThanDays?: number) => void
  getInsights: () => AnalyticsInsight
  exportEvents: () => string
}

// Generate session ID
const generateSessionId = () => `session_${nanoid()}_${Date.now()}`

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      events: [],
      sessionId: generateSessionId(),
      sessionStartTime: new Date(),
      isEnabled: true,

      trackEvent: (event) => {
        const state = get()
        if (!state.isEnabled) return

        const newEvent: AnalyticsEvent = {
          ...event,
          id: nanoid(),
          sessionId: state.sessionId,
          timestamp: new Date()
        }

        set((state) => ({
          events: [...state.events, newEvent]
        }))
      },

      setEnabled: (enabled) => {
        set({ isEnabled: enabled })
      },

      clearEvents: (olderThanDays = 30) => {
        const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
        set((state) => ({
          events: state.events.filter(event => new Date(event.timestamp) > cutoffDate)
        }))
      },

      getInsights: () => {
        const state = get()
        const events = state.events

        // Popular searches
        const searches = events.filter(e => e.type === 'search')
        const searchGroups = searches.reduce((acc, event) => {
          const query = event.metadata?.query || 'unknown'
          if (!acc[query]) {
            acc[query] = { count: 0, totalResults: 0 }
          }
          acc[query].count++
          acc[query].totalResults += event.metadata?.searchResultCount || 0
          return acc
        }, {} as Record<string, { count: number; totalResults: number }>)

        const popularSearches = Object.entries(searchGroups)
          .map(([query, data]) => ({
            query,
            count: data.count,
            avgResultCount: Math.round(data.totalResults / data.count)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Common navigation patterns
        const navigationEvents = events.filter(e => e.type === 'navigation')
        const navGroups = navigationEvents.reduce((acc, event) => {
          const from = event.metadata?.fromPage || 'unknown'
          const to = event.metadata?.toPage || 'unknown'
          const key = `${from}_to_${to}`
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const commonNavigation = Object.entries(navGroups)
          .map(([key, count]) => {
            const [from, , to] = key.split('_')
            return { from: from.replace('_', ' '), to: to.replace('_', ' '), count }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Bulk operation usage
        const bulkOps = events.filter(e => e.type === 'bulk_operation')
        const bulkGroups = bulkOps.reduce((acc, event) => {
          const action = event.action
          if (!acc[action]) {
            acc[action] = { count: 0, totalItems: 0, successes: 0 }
          }
          acc[action].count++
          acc[action].totalItems += event.metadata?.selectedItems || 0
          if (!event.metadata?.errorMessage) acc[action].successes++
          return acc
        }, {} as Record<string, { count: number; totalItems: number; successes: number }>)

        const bulkOperationUsage = Object.entries(bulkGroups)
          .map(([action, data]) => ({
            action,
            count: data.count,
            avgItems: Math.round(data.totalItems / data.count),
            successRate: Math.round((data.successes / data.count) * 100)
          }))
          .sort((a, b) => b.count - a.count)

        // Error patterns
        const errors = events.filter(e => e.type === 'error' || e.metadata?.errorMessage)
        const errorGroups = errors.reduce((acc, event) => {
          const error = event.metadata?.errorMessage || event.action
          const key = `${error}_${event.context}`
          if (!acc[key]) {
            acc[key] = { error, context: event.context, count: 0 }
          }
          acc[key].count++
          return acc
        }, {} as Record<string, { error: string; context: string; count: number }>)

        const errorPatterns = Object.values(errorGroups)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Performance metrics
        const perfEvents = events.filter(e => e.metadata?.performanceMs)
        const searchPerf = perfEvents.filter(e => e.type === 'search')
        const bulkPerf = perfEvents.filter(e => e.type === 'bulk_operation')

        const avgSearchTime = searchPerf.length > 0 
          ? Math.round(searchPerf.reduce((sum, e) => sum + (e.metadata?.performanceMs || 0), 0) / searchPerf.length)
          : 0

        const avgBulkOperationTime = bulkPerf.length > 0
          ? Math.round(bulkPerf.reduce((sum, e) => sum + (e.metadata?.performanceMs || 0), 0) / bulkPerf.length)
          : 0

        // User behavior
        const navEvents = events.filter(e => e.type === 'navigation' || e.type === 'view')
        const pageViews = navEvents.reduce((acc, event) => {
          const page = event.metadata?.toPage || event.metadata?.itemType || 'unknown'
          acc[page] = (acc[page] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const mostVisitedPages = Object.entries(pageViews)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Time distribution
        const timeDistribution = events.reduce((acc, event) => {
          const hour = new Date(event.timestamp).getHours()
          acc[hour] = (acc[hour] || 0) + 1
          return acc
        }, {} as Record<number, number>)

        const timeOfDayDistribution = Object.entries(timeDistribution)
          .map(([hour, count]) => ({ hour: parseInt(hour), count }))
          .sort((a, b) => a.hour - b.hour)

        const sessionDuration = Date.now() - state.sessionStartTime.getTime()
        const pagesPerSession = navEvents.length

        return {
          popularSearches,
          commonNavigation,
          bulkOperationUsage,
          errorPatterns,
          performanceMetrics: {
            avgSearchTime,
            avgBulkOperationTime,
            slowestOperations: []
          },
          userBehavior: {
            sessionDuration: Math.round(sessionDuration / 1000 / 60), // minutes
            pagesPerSession,
            mostVisitedPages,
            timeOfDayDistribution
          }
        }
      },

      exportEvents: () => {
        const state = get()
        return JSON.stringify(state.events, null, 2)
      }
    }),
    {
      name: 'analytics-storage',
      partialize: (state) => ({ 
        events: state.events.slice(-1000), // Keep only last 1000 events
        sessionId: state.sessionId,
        sessionStartTime: state.sessionStartTime.toISOString(),
        isEnabled: state.isEnabled
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert ISO string back to Date
          state.sessionStartTime = new Date(state.sessionStartTime as unknown as string)
          
          // Convert event timestamps back to Date objects
          state.events = state.events.map(event => ({
            ...event,
            timestamp: new Date(event.timestamp)
          }))
        }
      }
    }
  )
)

// Analytics Hook
export function useAnalytics(context: 'main' | 'admin' = 'main') {
  const { trackEvent, isEnabled, setEnabled, getInsights, clearEvents, exportEvents } = useAnalyticsStore()

  // Helper functions for common tracking scenarios
  const trackSearch = useCallback((query: string, resultCount: number, performanceMs?: number) => {
    trackEvent({
      type: 'search',
      action: 'search_query',
      context,
      metadata: { query, searchResultCount: resultCount, performanceMs }
    })
  }, [trackEvent, context])


  const trackNavigation = useCallback((fromPage: string, toPage: string) => {
    trackEvent({
      type: 'navigation',
      action: 'navigate',
      context,
      metadata: { fromPage, toPage }
    })
  }, [trackEvent, context])

  const trackBulkOperation = useCallback((actionType: string, selectedItems: number, performanceMs?: number, error?: string) => {
    trackEvent({
      type: 'bulk_operation',
      action: actionType,
      context,
      metadata: { 
        bulkActionType: actionType,
        selectedItems, 
        performanceMs,
        errorMessage: error 
      }
    })
  }, [trackEvent, context])

  const trackItemView = useCallback((itemType: string, itemId: string) => {
    trackEvent({
      type: 'view',
      action: 'view_item',
      context,
      metadata: { itemType, itemId }
    })
  }, [trackEvent, context])

  const trackDownload = useCallback((itemType: string, itemId: string) => {
    trackEvent({
      type: 'download',
      action: 'download_item',
      context,
      metadata: { itemType, itemId }
    })
  }, [trackEvent, context])

  const trackUpload = useCallback((itemCount: number, performanceMs?: number) => {
    trackEvent({
      type: 'upload',
      action: 'upload_items',
      context,
      metadata: { selectedItems: itemCount, performanceMs }
    })
  }, [trackEvent, context])

  const trackError = useCallback((action: string, errorMessage: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      type: 'error',
      action,
      context,
      metadata: { errorMessage, ...metadata }
    })
  }, [trackEvent, context])

  const trackCustom = useCallback((type: AnalyticsEvent['type'], action: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      type,
      action,
      context,
      metadata
    })
  }, [trackEvent, context])

  return {
    // Core tracking
    trackEvent,
    
    // Helper functions
    trackSearch,
    trackNavigation,
    trackBulkOperation,
    trackItemView,
    trackDownload,
    trackUpload,
    trackError,
    trackCustom,
    
    // Analytics management
    isEnabled,
    setEnabled,
    getInsights,
    clearEvents,
    exportEvents
  }
}

// Performance measurement hook
export function usePerformanceTracking() {
  const startTime = useCallback(() => {
    return performance.now()
  }, [])

  const measureAndTrack = useCallback((
    startTime: number,
    trackFn: (performanceMs: number) => void
  ) => {
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    trackFn(duration)
    return duration
  }, [])

  return { startTime, measureAndTrack }
}

// Hook for analytics insights dashboard
export function useAnalyticsInsights() {
  const { getInsights } = useAnalyticsStore()
  
  const insights = getInsights()
  
  return {
    insights,
    refreshInsights: getInsights
  }
}