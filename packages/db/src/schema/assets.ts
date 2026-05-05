import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { createdAt, uuidPk } from './_shared'
import { organizations } from './organizations'
import { users } from './users'

export const assets = pgTable('assets', {
  id: uuidPk(),
  brandId: uuid('brand_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  uploadedByUserId: uuid('uploaded_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  originalFilename: text('original_filename').notNull(),
  r2Key: text('r2_key').notNull(),
  treatedR2Key: text('treated_r2_key'),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: createdAt(),
})

export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
