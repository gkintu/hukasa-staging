import Valkey from 'iovalkey'

/**
 * Valkey Cache Service
 * Provides a cache abstraction layer with read-through, write-behind patterns
 * No TTL - cache until explicitly invalidated for optimal performance
 */
class ValkeyService {
  private client: Valkey
  private isConnected = false

  constructor() {
    // Require password in production/preview environments
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'preview'
    if (isProduction && !process.env.VALKEY_PASSWORD) {
      throw new Error('VALKEY_PASSWORD is required in production/preview environments')
    }

    // Initialize Valkey client with connection options
    const config: any = {
      host: process.env.VALKEY_HOST!,
      port: parseInt(process.env.VALKEY_PORT!),
      db: parseInt(process.env.VALKEY_DB!),
      // Connection settings
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      // Client identification
      name: 'hukasa-staging',
    }

    // Only set password if provided (optional in dev, required in prod)
    if (process.env.VALKEY_PASSWORD) {
      config.password = process.env.VALKEY_PASSWORD
    }

    this.client = new Valkey(config)

    // Connection event handlers
    this.client.on('connect', () => {
      this.isConnected = true
      console.log('✅ Valkey connected')
    })

    this.client.on('error', (err: Error) => {
      this.isConnected = false
      console.error('❌ Valkey connection error:', err)
    })

    this.client.on('close', () => {
      this.isConnected = false
      console.log('🔌 Valkey connection closed')
    })
  }

  /**
   * Check if Valkey is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.ping()
      return true
    } catch (error) {
      console.warn('Valkey not available:', error)
      return false
    }
  }

  /**
   * Read-through cache pattern
   * Try cache first, fallback to fetcher function, store result
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      serialize?: (data: T) => string
      deserialize?: (data: string) => T
    }
  ): Promise<T> {
    const serialize = options?.serialize || JSON.stringify
    const deserialize = options?.deserialize || JSON.parse

    try {
      // Try cache first
      const cached = await this.client.get(key)
      if (cached !== null) {
        return deserialize(cached)
      }
    } catch (error) {
      console.warn('Cache read failed, falling back to database:', error)
    }

    // Cache miss - fetch from source
    const data = await fetcher()

    // Store in cache (fire and forget - don't block response)
    this.set(key, data, { serialize }).catch(err =>
      console.warn('Cache write failed:', err)
    )

    return data
  }

  /**
   * Set key-value pair in cache (no TTL - cache forever)
   */
  async set<T>(
    key: string,
    value: T,
    options?: {
      serialize?: (data: T) => string
    }
  ): Promise<void> {
    const serialize = options?.serialize || JSON.stringify

    try {
      await this.client.set(key, serialize(value))
    } catch (error) {
      console.warn('Cache set failed:', error)
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(
    key: string,
    options?: {
      deserialize?: (data: string) => T
    }
  ): Promise<T | null> {
    const deserialize = options?.deserialize || JSON.parse

    try {
      const cached = await this.client.get(key)
      return cached ? deserialize(cached) : null
    } catch (error) {
      console.warn('Cache get failed:', error)
      return null
    }
  }

  /**
   * Delete single key (cache invalidation)
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      console.warn('Cache delete failed:', error)
    }
  }

  /**
   * Delete multiple keys (bulk invalidation)
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return

    try {
      await this.client.del(...keys)
    } catch (error) {
      console.warn('Cache bulk delete failed:', error)
    }
  }

  /**
   * Pattern-based invalidation (e.g., "user:123:*")
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern)
      if (keys.length > 0) {
        await this.client.del(...keys)
      }
    } catch (error) {
      console.warn('Pattern invalidation failed:', error)
    }
  }

  /**
   * Bulk get multiple keys
   */
  async mget<T>(
    keys: string[],
    options?: {
      deserialize?: (data: string) => T
    }
  ): Promise<(T | null)[]> {
    if (keys.length === 0) return []

    const deserialize = options?.deserialize || JSON.parse

    try {
      const values = await this.client.mget(...keys)
      return values.map((value: string | null) => value ? deserialize(value) : null)
    } catch (error) {
      console.warn('Cache mget failed:', error)
      return new Array(keys.length).fill(null)
    }
  }

  /**
   * Bulk set multiple key-value pairs
   */
  async mset<T>(
    keyValues: Record<string, T>,
    options?: {
      serialize?: (data: T) => string
    }
  ): Promise<void> {
    const serialize = options?.serialize || JSON.stringify
    const entries = Object.entries(keyValues)

    if (entries.length === 0) return

    try {
      const flatArray: string[] = []
      for (const [key, value] of entries) {
        flatArray.push(key, serialize(value))
      }
      await this.client.mset(...flatArray)
    } catch (error) {
      console.warn('Cache mset failed:', error)
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      console.warn('Cache exists check failed:', error)
      return false
    }
  }

  /**
   * Get connection stats
   */
  async getStats(): Promise<{
    connected: boolean
    dbSize: number
    memory: string
  }> {
    try {
      const [dbSize, info] = await Promise.all([
        this.client.dbsize(),
        this.client.info('memory')
      ])

      // Parse memory usage from info string
      const memoryMatch = info.match(/used_memory_human:([\d.]+[KMG]?B?)/)
      const memory = memoryMatch ? memoryMatch[1] : 'unknown'

      return {
        connected: this.isConnected,
        dbSize,
        memory
      }
    } catch (error) {
      return {
        connected: false,
        dbSize: 0,
        memory: 'unknown'
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const start = Date.now()
      await this.client.ping()
      const latency = Date.now() - start

      return { status: 'healthy', latency }
    } catch (error) {
      return { status: 'unhealthy' }
    }
  }

  /**
   * Publish message to channel (Pub/Sub)
   */
  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message)
    } catch (error) {
      console.warn('Valkey publish failed:', error)
      throw error
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit()
      console.log('🔌 Valkey disconnected gracefully')
    } catch (error) {
      console.warn('Valkey disconnect error:', error)
    }
  }
}

// Singleton instance
let valkeyService: ValkeyService | null = null

export function getValkeyService(): ValkeyService {
  if (!valkeyService) {
    valkeyService = new ValkeyService()
  }
  return valkeyService
}

// Export singleton instance for convenience
export const valkey = getValkeyService()

// Cache key factories for consistent key naming
export const CacheKeys = {
  // User-scoped data
  userImages: (userId: string) => `user:${userId}:images`,
  userImagesMetadata: (userId: string) => `user:${userId}:images:metadata`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  userProject: (userId: string, projectId: string) => `user:${userId}:project:${projectId}`,

  // Image data
  imageDetail: (imageId: string) => `image:${imageId}:detail`,
  imageVariants: (imageId: string) => `image:${imageId}:variants`,

  // Admin data
  adminStats: () => `admin:stats`,
  adminChart: (chartType: string, date?: string) =>
    date ? `admin:chart:${chartType}:${date}` : `admin:chart:${chartType}`,
  adminUsers: (query?: string) =>
    query ? `admin:users:${query}` : `admin:users`,

  // Session data
  session: (token: string) => `session:${token}`,
  userProfile: (userId: string) => `user:${userId}:profile`,

  // System data
  systemSettings: () => `system:settings`,
  systemAnnouncement: (id: string) => `announcement:${id}`,
  systemAnnouncementActive: () => `announcement:active`, // Points to current active announcement ID

  // Helper for pattern matching
  userPattern: (userId: string) => `user:${userId}:*`,
  adminPattern: () => `admin:*`,
  imagePattern: (imageId: string) => `image:${imageId}:*`,
} as const

export type CacheKey = keyof typeof CacheKeys