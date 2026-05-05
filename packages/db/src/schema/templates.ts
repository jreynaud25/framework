import { index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { templateStatusEnum } from './enums'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { organizations } from './organizations'
import type { Format } from '@framework/types'

export interface FormatConstraints {
  formats: Format[]
  minResolution?: { width: number; height: number }
  maxResolution?: { width: number; height: number }
}

export const templates = pgTable(
  'templates',
  {
    id: uuidPk(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: templateStatusEnum('status').notNull().default('draft'),
    thumbnailR2Key: text('thumbnail_r2_key'),
    /** FK set later once template_versions exists; nullable to break cycle */
    currentVersionId: uuid('current_version_id'),
    figmaFileKey: text('figma_file_key'),
    figmaNodeId: text('figma_node_id'),
    formatConstraints: jsonb('format_constraints').$type<FormatConstraints>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    brandSlugIdx: uniqueIndex('templates_brand_slug_idx').on(t.brandId, t.slug),
    brandIdx: index('templates_brand_idx').on(t.brandId),
    figmaFileKeyIdx: index('templates_figma_file_key_idx').on(t.figmaFileKey),
  }),
)

export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
