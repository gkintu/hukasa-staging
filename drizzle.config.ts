import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})