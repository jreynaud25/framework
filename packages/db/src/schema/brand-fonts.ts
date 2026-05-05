import { jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { fontSourceEnum } from './enums'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { organizations } from './organizations'

export type FontSourceData =
  | { kind: 'google'; name: string; weights: number[] }
  | { kind: 'adobe'; kitId: string; projectId: string }
  | {
      kind: 'self_hosted'
      variants: Array<{
        weight: number
        style: 'normal' | 'italic'
        r2Key: string
        fileSize: number
        format: 'woff2' | 'woff' | 'ttf' | 'otf'
      }>
    }
  | { kind: 'system'; stack: string }

export const brandFonts = pgTable(
  'brand_fonts',
  {
    id: uuidPk(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    tokenKey: text('token_key').notNull(),
    familyName: text('family_name').notNull(),
    source: fontSourceEnum('source').notNull(),
    sourceData: jsonb('source_data').$type<FontSourceData>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    brandTokenKeyIdx: uniqueIndex('brand_fonts_brand_token_key_idx').on(t.brandId, t.tokenKey),
  }),
)

export type BrandFont = typeof brandFonts.$inferSelect
export type NewBrandFont = typeof brandFonts.$inferInsert
