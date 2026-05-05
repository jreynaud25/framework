import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { brandFonts } from './brand-fonts'
import { uuidPk } from './_shared'
import { users } from './users'
import { sql } from 'drizzle-orm'

/**
 * Append-only legal log. The brand admin attests they hold a webfont
 * license covering *.frame-work.app/{tenant}. Liability sits with the
 * attesting admin (BRIEF §3.3).
 */
export const fontLicenseAttestations = pgTable('font_license_attestations', {
  id: uuidPk(),
  brandFontId: uuid('brand_font_id')
    .notNull()
    .references(() => brandFonts.id, { onDelete: 'cascade' }),
  attestedByUserId: uuid('attested_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  attestationText: text('attestation_text').notNull(),
  licensePdfR2Key: text('license_pdf_r2_key'),
  fontFileHash: text('font_file_hash').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  attestedAt: timestamp('attested_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

export type FontLicenseAttestation = typeof fontLicenseAttestations.$inferSelect
export type NewFontLicenseAttestation = typeof fontLicenseAttestations.$inferInsert
