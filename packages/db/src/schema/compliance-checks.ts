import { sql } from 'drizzle-orm'
import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { ComplianceFlag } from '@framework/types'
import { complianceResultEnum } from './enums'
import { uuidPk } from './_shared'
import { exports } from './exports'

export const complianceChecks = pgTable(
  'compliance_checks',
  {
    id: uuidPk(),
    exportId: uuid('export_id')
      .notNull()
      .references(() => exports.id, { onDelete: 'cascade' }),
    modelId: text('model_id').notNull(),
    result: complianceResultEnum('result').notNull(),
    flags: jsonb('flags').$type<ComplianceFlag[]>().notNull().default([]),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    costUsdMicros: bigint('cost_usd_micros', { mode: 'number' }).notNull(),
    durationMs: integer('duration_ms').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    exportResultIdx: index('compliance_checks_export_result_idx').on(t.exportId, t.result),
  }),
)

export type ComplianceCheck = typeof complianceChecks.$inferSelect
export type NewComplianceCheck = typeof complianceChecks.$inferInsert
