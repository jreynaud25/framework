import { bigint, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { commissionStatusEnum } from './enums'
import { createdAt, uuidPk } from './_shared'
import { organizations } from './organizations'
import { subscriptions } from './subscriptions'

export const commissionPayouts = pgTable(
  'commission_payouts',
  {
    id: uuidPk(),
    studioId: uuid('studio_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'restrict' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    grossRevenueCents: bigint('gross_revenue_cents', { mode: 'number' }).notNull(),
    commissionRate: numeric('commission_rate', { precision: 5, scale: 4 }).notNull(),
    commissionCents: bigint('commission_cents', { mode: 'number' }).notNull(),
    status: commissionStatusEnum('status').notNull().default('pending'),
    stripeTransferId: text('stripe_transfer_id'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({
    subscriptionPeriodIdx: uniqueIndex('commission_payouts_sub_period_idx').on(
      t.subscriptionId,
      t.periodStart,
    ),
  }),
)

export type CommissionPayout = typeof commissionPayouts.$inferSelect
export type NewCommissionPayout = typeof commissionPayouts.$inferInsert
