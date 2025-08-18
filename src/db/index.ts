import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create connection pool - Next.js automatically loads env vars
const queryClient = postgres(process.env.DATABASE_URL!)

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'