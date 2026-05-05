import { numeric, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { organizations } from './organizations'

export const studioBrandLinks = pgTable(
  'studio_brand_links',
  {
    id: uuidPk(),
    studioId: uuid('studio_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 4 })
      .notNull()
      .default('0.3000'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    studioBrandIdx: uniqueIndex('studio_brand_links_studio_brand_idx').on(t.studioId, t.brandId),
  }),
)

export type StudioBrandLink = typeof studioBrandLinks.$inferSelect
export type NewStudioBrandLink = typeof studioBrandLinks.$inferInsert
