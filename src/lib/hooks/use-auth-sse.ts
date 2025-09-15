import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface AuthSSEEvent {
  type: 'CONNECTED' | 'HEARTBEAT' | 'USER_BANNED' | 'USER_UNBANNED'
  userId?: string
  suspended?: boolean
  timestamp: number
}

export function useAuthSSE() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  const handleBanEvent = async () => {
    console.log('[Auth SSE] User has been banned, logging out...')

    // Clear all cached data
    queryClient.clear()

    // Show notification
    toast.error('Your account has been suspended. You will be logged out.')

    // Force logout by clearing session and redirecting
    // Note: You might need to adjust this based on your auth implementation
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('[Auth SSE] Error during logout:', error)
    }

    // Redirect to suspended page
    router.push('/account-suspended')
  }

  const connect = () => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return // Already connected
    }

    cleanup()

    console.log('[Auth SSE] Connecting to auth events...')

    const eventSource = new EventSource('/api/sse/auth-events')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('[Auth SSE] Connected successfully')
      reconnectAttempts.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const data: AuthSSEEvent = JSON.parse(event.data)

        switch (data.type) {
          case 'CONNECTED':
            console.log('[Auth SSE] Connection established')
            break

          case 'HEARTBEAT':
            // Ignore heartbeats, they just keep connection alive
            break

          case 'USER_BANNED':
            console.log('[Auth SSE] User banned event received')
            handleBanEvent()
            break

          case 'USER_UNBANNED':
            console.log('[Auth SSE] User unbanned event received')
            toast.success('Your account has been reinstated.')
            // Optionally invalidate queries to refresh user data
            queryClient.invalidateQueries({ queryKey: ['user'] })
            break

          default:
            console.log('[Auth SSE] Unknown event type:', data.type)
        }
      } catch (error) {
        console.error('[Auth SSE] Error parsing event data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[Auth SSE] Connection error:', error)

      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[Auth SSE] Connection closed, attempting to reconnect...')

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000) // Exponential backoff, max 30s

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Auth SSE] Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`)
            connect()
          }, delay)
        } else {
          console.error('[Auth SSE] Max reconnection attempts reached, giving up')
          toast.error('Lost connection to server. Please refresh the page.')
        }
      }
    }
  }

  useEffect(() => {
    // Start SSE connection
    connect()

    // Cleanup on unmount
    return cleanup
  }, [])

  // Expose reconnect function for manual retry
  const reconnect = () => {
    reconnectAttempts.current = 0
    connect()
  }

  return {
    reconnect,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  }
}