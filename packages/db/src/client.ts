import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Lazy DB client.
 *
 * The Brand Hub homepage, /api/health, and the editor's mock loader all
 * boot with zero env. Only API routes that actually touch Postgres pay
 * the connection cost. Throws on first query if DATABASE_URL is unset
 * — boot stays clean.
 */

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>

let _db: DrizzleDB | null = null

function init(): DrizzleDB {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is required for this code path. Set it in .env.local — ' +
        'or skip the route that called into the db.',
    )
  }
  const queryClient = postgres(url, {
    max: Number(process.env.DB_MAX_CONNECTIONS ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })
  return drizzle(queryClient, { schema, casing: 'snake_case' })
}

export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop, receiver) {
    if (!_db) _db = init()
    return Reflect.get(_db, prop, receiver)
  },
})

export type DB = DrizzleDB
export { schema }
