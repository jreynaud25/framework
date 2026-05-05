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
import type { BrandTokens } from '@framework/types'
import { createdAt, uuidPk } from './_shared'
import { organizations } from './organizations'
import { users } from './users'

export const brandTokenVersions = pgTable(
  'brand_token_versions',
  {
    id: uuidPk(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokens: jsonb('tokens').$type<BrandTokens>().notNull(),
    sourceFigmaFileKey: text('source_figma_file_key'),
    sourceFigmaExtractAt: timestamp('source_figma_extract_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    brandVersionIdx: uniqueIndex('brand_token_versions_brand_version_idx').on(
      t.brandId,
      t.versionNumber,
    ),
    publishedIdx: index('brand_token_versions_published_idx').on(t.brandId, t.isPublished),
  }),
)

export type BrandTokenVersion = typeof brandTokenVersions.$inferSelect
export type NewBrandTokenVersion = typeof brandTokenVersions.$inferInsert
