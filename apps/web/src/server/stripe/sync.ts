import 'server-only'
import type Stripe from 'stripe'
import type { SubscriptionStatus, SubscriptionTier } from '@framework/types'
import { tierForPriceId } from './client'

export interface SubscriptionSyncRow {
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  mrrCents: number
  currency: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  canceledAt: Date | null
}

/**
 * Build the row we'd UPSERT into `subscriptions`. Pure function so it's
 * trivially testable without a Stripe live mode key.
 *
 * Caller resolves `organizationId` from subscription.metadata.organization_id
 * (set when the org first subscribes via Checkout).
 */
export function subscriptionRowFromStripe(
  sub: Stripe.Subscription,
  organizationId: string,
): SubscriptionSyncRow | null {
  const item = sub.items.data[0]
  if (!item) return null
  const priceId = item.price.id
  const tier = tierForPriceId(priceId)
  if (!tier) return null

  return {
    organizationId,
    stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    tier,
    status: mapStatus(sub.status),
    mrrCents: monthlyAmountCents(item),
    currency: sub.currency,
    currentPeriodStart: toDate(sub.current_period_start),
    currentPeriodEnd: toDate(sub.current_period_end),
    trialEndsAt: toDate(sub.trial_end),
    canceledAt: toDate(sub.canceled_at),
  }
}

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'canceled'
    case 'paused':
      return 'paused'
    case 'incomplete':
    default:
      return 'past_due'
  }
}

function monthlyAmountCents(item: Stripe.SubscriptionItem): number {
  const amount = item.price.unit_amount ?? 0
  const interval = item.price.recurring?.interval
  const intervalCount = item.price.recurring?.interval_count ?? 1
  if (interval === 'year') return Math.round(amount / (12 * intervalCount))
  if (interval === 'week') return Math.round((amount * 52) / 12 / intervalCount)
  if (interval === 'day') return Math.round((amount * 365) / 12 / intervalCount)
  // 'month'
  return Math.round(amount / intervalCount)
}

function toDate(unix: number | null | undefined): Date | null {
  return unix ? new Date(unix * 1000) : null
}
