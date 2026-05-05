import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { LayoutNode, SlotSchema } from '@framework/types'
import { createdAt, uuidPk } from './_shared'
import { templates } from './templates'
import { brandTokenVersions } from './brand-token-versions'
import { users } from './users'

export const templateVersions = pgTable(
  'template_versions',
  {
    id: uuidPk(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    boundTokenVersionId: uuid('bound_token_version_id')
      .notNull()
      .references(() => brandTokenVersions.id, { onDelete: 'restrict' }),
    layoutSchema: jsonb('layout_schema').$type<LayoutNode>().notNull(),
    slotSchema: jsonb('slot_schema').$type<SlotSchema>().notNull(),
    sourceFigmaExport: jsonb('source_figma_export').$type<Record<string, unknown>>(),
    previewR2Key: text('preview_r2_key'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => ({
    templateVersionIdx: uniqueIndex('template_versions_template_version_idx').on(
      t.templateId,
      t.versionNumber,
    ),
    publishedIdx: index('template_versions_published_idx').on(t.templateId, t.isPublished),
  }),
)

export type TemplateVersion = typeof templateVersions.$inferSelect
export type NewTemplateVersion = typeof templateVersions.$inferInsert
