import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { createdAt, updatedAt, uuidPk } from './_shared'

export const users = pgTable(
  'users',
  {
    id: uuidPk(),
    clerkId: text('clerk_id').notNull(),
    email: text('email').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    clerkIdIdx: uniqueIndex('users_clerk_id_idx').on(t.clerkId),
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
