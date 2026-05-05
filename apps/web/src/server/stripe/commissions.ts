import 'server-only'

/**
 * Commission calculation. BRIEF §6: 30% recurring rev-share to the studio
 * that brought a brand. Runs as a monthly cron (apps/web/src/app/api/cron/
 * commissions/route.ts) protected by CRON_SECRET.
 *
 * Algorithm:
 *   For each brand subscription that was active during the period:
 *     - Find the studio_brand_link (commission_rate, default 0.30)
 *     - Sum gross revenue from Stripe invoices in the period
 *     - INSERT commission_payouts (status='pending')
 *     - Idempotency: UNIQUE (subscription_id, period_start) prevents dupes
 *   Caller (cron) is responsible for triggering Stripe transfers later.
 */
export interface PeriodInput {
  /** Inclusive start of the period (UTC). */
  periodStart: Date
  /** Exclusive end of the period (UTC). */
  periodEnd: Date
}

export interface CommissionRow {
  studioId: string
  brandId: string
  subscriptionId: string
  periodStart: Date
  periodEnd: Date
  grossRevenueCents: number
  commissionRate: number
  commissionCents: number
  status: 'pending'
}

export interface CommissionInputBrand {
  subscriptionId: string
  brandId: string
  studioId: string
  commissionRate: number
  grossRevenueCents: number
}

export function buildCommissionRows(
  period: PeriodInput,
  brands: CommissionInputBrand[],
): CommissionRow[] {
  return brands
    .filter((b) => b.grossRevenueCents > 0 && b.commissionRate > 0)
    .map((b) => ({
      studioId: b.studioId,
      brandId: b.brandId,
      subscriptionId: b.subscriptionId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      grossRevenueCents: b.grossRevenueCents,
      commissionRate: b.commissionRate,
      commissionCents: Math.round(b.grossRevenueCents * b.commissionRate),
      status: 'pending' as const,
    }))
}

export function lastMonthPeriod(now = new Date()): PeriodInput {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return { periodStart: start, periodEnd: end }
}
