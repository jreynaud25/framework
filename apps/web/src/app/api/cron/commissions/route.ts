import { NextResponse, type NextRequest } from 'next/server'
import { buildCommissionRows, lastMonthPeriod } from '@/server/stripe/commissions'

/**
 * GET /api/cron/commissions
 *
 * Vercel Cron: runs at 02:00 UTC on the 1st of every month
 * (configured in vercel.json). Calculates pending commission payouts for
 * the previous calendar month and inserts them into commission_payouts.
 *
 * Protected by `Authorization: Bearer ${CRON_SECRET}`.
 */
export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const period = lastMonthPeriod()

  // TODO(week 13): pull active brand subs in the period from `subscriptions`
  // joined with `studio_brand_links` and Stripe invoices for gross revenue.
  // For now this is a structural skeleton that returns 0 rows.
  const rows = buildCommissionRows(period, [])

  // TODO(week 13): db.insert(commissionPayouts).values(rows).onConflictDoNothing()

  return NextResponse.json({
    period: {
      start: period.periodStart.toISOString(),
      end: period.periodEnd.toISOString(),
    },
    rowsInserted: rows.length,
  })
}
