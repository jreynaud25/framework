import { sql } from 'drizzle-orm'
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { SlotValues } from '@framework/types'
import { exportFormatEnum } from './enums'
import { uuidPk } from './_shared'
import { compositions } from './compositions'
import { users } from './users'

export const exports = pgTable(
  'exports',
  {
    id: uuidPk(),
    compositionId: uuid('composition_id')
      .notNull()
      .references(() => compositions.id, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    format: exportFormatEnum('format').notNull(),
    resolution: text('resolution'),
    scale: integer('scale').notNull().default(1),
    r2Key: text('r2_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    slotValuesSnapshot: jsonb('slot_values_snapshot').$type<SlotValues>().notNull(),
    renderDurationMs: integer('render_duration_ms').notNull(),
    renderedAt: timestamp('rendered_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    compositionIdx: index('exports_composition_idx').on(t.compositionId),
    renderedAtIdx: index('exports_rendered_at_idx').on(t.renderedAt),
  }),
)

export type Export = typeof exports.$inferSelect
export type NewExport = typeof exports.$inferInsert
