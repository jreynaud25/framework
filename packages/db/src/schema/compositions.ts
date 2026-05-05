import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { Format, SlotValues } from '@framework/types'
import { compositionStatusEnum } from './enums'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { organizations } from './organizations'
import { templateVersions } from './template-versions'
import { users } from './users'

export const compositions = pgTable(
  'compositions',
  {
    id: uuidPk(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    templateVersionId: uuid('template_version_id')
      .notNull()
      .references(() => templateVersions.id, { onDelete: 'restrict' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    status: compositionStatusEnum('status').notNull().default('draft'),
    slotValues: jsonb('slot_values').$type<SlotValues>().notNull(),
    format: text('format').$type<Format>().notNull(),
    thumbnailR2Key: text('thumbnail_r2_key'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    brandStatusUserIdx: index('compositions_brand_status_user_idx').on(
      t.brandId,
      t.status,
      t.createdByUserId,
    ),
    templateVersionIdx: index('compositions_template_version_idx').on(t.templateVersionId),
  }),
)

export type Composition = typeof compositions.$inferSelect
export type NewComposition = typeof compositions.$inferInsert
