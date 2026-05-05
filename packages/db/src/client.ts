import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL

if (!url) {
  // Fail fast at boot instead of crashing on the first query.
  throw new Error('DATABASE_URL is required')
}

const queryClient = postgres(url, {
  // Supabase + Vercel Edge: prefer fewer, longer-lived connections.
  max: Number(process.env.DB_MAX_CONNECTIONS ?? 10),
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
})

export const db = drizzle(queryClient, { schema, casing: 'snake_case' })
export type DB = typeof db
export { schema }
