// In-memory cache for suspended users
// This eliminates database hits for session validation

class SuspendedUsersCache {
  private suspendedUsers = new Set<string>()
  private initialized = false

  async initialize() {
    if (this.initialized) return

    try {
      // Load initially suspended users from database on startup
      const { db } = await import('@/db')
      const { users } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const suspendedUsersList = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.suspended, true))

      this.suspendedUsers.clear()
      suspendedUsersList.forEach(user => {
        this.suspendedUsers.add(user.id)
      })

      this.initialized = true
      console.log(`[Cache] Initialized with ${suspendedUsersList.length} suspended users`)
    } catch (error) {
      console.error('[Cache] Failed to initialize suspended users cache:', error)
    }
  }

  isSuspended(userId: string): boolean {
    return this.suspendedUsers.has(userId)
  }

  setSuspended(userId: string, suspended: boolean) {
    if (suspended) {
      this.suspendedUsers.add(userId)
      console.log(`[Cache] User ${userId} marked as suspended`)
    } else {
      this.suspendedUsers.delete(userId)
      console.log(`[Cache] User ${userId} removed from suspended list`)
    }
  }

  clear() {
    this.suspendedUsers.clear()
    this.initialized = false
  }

  getSize(): number {
    return this.suspendedUsers.size
  }
}

// Singleton instance
export const suspendedUsersCache = new SuspendedUsersCache()