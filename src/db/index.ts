import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

// For single connection
const queryClient = postgres(process.env.DATABASE_URL!)

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'