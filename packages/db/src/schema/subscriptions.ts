import { bigint, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { subscriptionStatusEnum, subscriptionTierEnum } from './enums'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { organizations } from './organizations'

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuidPk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull(),
    tier: subscriptionTierEnum('tier').notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    mrrCents: bigint('mrr_cents', { mode: 'number' }).notNull().default(0),
    currency: text('currency').notNull().default('eur'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    stripeSubIdx: uniqueIndex('subscriptions_stripe_subscription_id_idx').on(t.stripeSubscriptionId),
    organizationIdx: uniqueIndex('subscriptions_organization_idx').on(t.organizationId),
  }),
)

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
