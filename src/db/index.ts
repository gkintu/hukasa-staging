import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create connection pool with proper limits for Next.js
const queryClient = postgres(process.env.DATABASE_URL!, {
  max: 15,              // Sweet spot: handles peaks + growth buffer
  idle_timeout: 20,     // Standard cleanup
  connect_timeout: 30,  // Generous wait time
  max_lifetime: 1800    // 30min refresh
})

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'