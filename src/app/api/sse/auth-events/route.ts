import { NextRequest } from 'next/server'
import postgres from 'postgres'
import Valkey from 'iovalkey'
import { validateApiSession } from '@/lib/auth-utils'
import { suspendedUsersCache } from '@/lib/suspended-users-cache'

// Map to track SSE connections per user
const userConnections = new Map<string, ReadableStreamDefaultController[]>()

// PostgreSQL client for LISTEN
const pgClient = postgres(process.env.DATABASE_URL!, {
  max: 1, // Single connection for LISTEN
  idle_timeout: 0, // Keep connection alive
  connect_timeout: 30,
})

// Valkey subscriber client for Pub/Sub (announcements)
const valkeySubscriber = new Valkey({
  host: process.env.VALKEY_HOST!,
  port: parseInt(process.env.VALKEY_PORT!),
  db: parseInt(process.env.VALKEY_DB!),
  password: process.env.VALKEY_PASSWORD,
  lazyConnect: true,
  name: 'hukasa-sse-subscriber',
})

// Start listening to PostgreSQL notifications
let isListening = false
async function startListening() {
  if (isListening) return
  isListening = true

  try {
    // Initialize the suspended users cache
    await suspendedUsersCache.initialize()

    await pgClient.listen('user_suspension_changed', (payload) => {
      try {
        const data = JSON.parse(payload)
        const { userId, suspended, timestamp } = data

        console.log(`[SSE] User ${userId} suspension changed: ${suspended}`)

        // Update in-memory cache immediately
        suspendedUsersCache.setSuspended(userId, suspended)

        // Get all connections for this user
        const userControllers = userConnections.get(userId) || []

        // Send SSE event to all user's connections
        const eventData = JSON.stringify({
          type: suspended ? 'USER_BANNED' : 'USER_UNBANNED',
          userId,
          suspended,
          timestamp
        })

        userControllers.forEach((controller) => {
          try {
            controller.enqueue(`data: ${eventData}\n\n`)
          } catch (error) {
            console.error('[SSE] Error sending to controller:', error)
          }
        })

        // Clean up closed connections
        const activeControllers = userControllers.filter((controller) => {
          try {
            // Test if controller is still active
            return controller.desiredSize !== null
          } catch {
            return false
          }
        })

        if (activeControllers.length === 0) {
          userConnections.delete(userId)
        } else {
          userConnections.set(userId, activeControllers)
        }

      } catch (error) {
        console.error('[SSE] Error processing notification:', error)
      }
    })

    console.log('[SSE] Started listening to PostgreSQL notifications')

    // Subscribe to Valkey Pub/Sub for announcements (global broadcast)
    await valkeySubscriber.connect()
    await valkeySubscriber.subscribe('announcement:changed')

    valkeySubscriber.on('message', (channel, message) => {
      if (channel === 'announcement:changed') {
        try {
          const data = JSON.parse(message)
          console.log(`[SSE] Announcement changed:`, data.type)

          // Broadcast to ALL connected users (announcements are global)
          const allControllers: ReadableStreamDefaultController[] = []
          userConnections.forEach((controllers) => {
            allControllers.push(...controllers)
          })

          const eventData = JSON.stringify(data)
          allControllers.forEach((controller) => {
            try {
              controller.enqueue(`data: ${eventData}\n\n`)
            } catch (error) {
              console.error('[SSE] Error broadcasting announcement:', error)
            }
          })

          console.log(`[SSE] Broadcasted announcement to ${allControllers.length} connections`)
        } catch (error) {
          console.error('[SSE] Error processing announcement:', error)
        }
      }
    })

    console.log('[SSE] Started listening to Valkey announcements')
  } catch (error) {
    console.error('[SSE] Error starting listeners:', error)
  }
}

export async function GET(request: NextRequest) {
  // Validate session
  const sessionResult = await validateApiSession(request)
  if (!sessionResult.success || !sessionResult.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = sessionResult.user.id

  // Start PostgreSQL listener if not already running
  await startListening()

  // Create SSE stream
  let streamController: ReadableStreamDefaultController | null = null
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller
      console.log(`[SSE] User ${userId} connected`)

      // Add this controller to user's connections
      if (!userConnections.has(userId)) {
        userConnections.set(userId, [])
      }
      userConnections.get(userId)!.push(controller)

      // Send initial connection event
      controller.enqueue(`data: ${JSON.stringify({
        type: 'CONNECTED',
        userId,
        timestamp: Date.now()
      })}\n\n`)

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'HEARTBEAT',
            timestamp: Date.now()
          })}\n\n`)
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)
    },

    cancel() {
      console.log(`[SSE] User ${userId} disconnected`)
      // Clean up user connections
      const connections = userConnections.get(userId) || []
      const updatedConnections = connections.filter((c) => c !== streamController)

      if (updatedConnections.length === 0) {
        userConnections.delete(userId)
      } else {
        userConnections.set(userId, updatedConnections)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}