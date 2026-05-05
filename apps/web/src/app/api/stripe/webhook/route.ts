import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/server/stripe/client'
import { subscriptionRowFromStripe } from '@/server/stripe/sync'

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook handler. Verifies the signature with STRIPE_WEBHOOK_SECRET,
 * routes by event type, and writes through to `subscriptions` (TODO: db
 * insert added in week 13 once Supabase is provisioned).
 */
export const runtime = 'nodejs'

const RELEVANT_EVENTS = new Set<Stripe.Event.Type>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export async function POST(req: NextRequest): Promise<Response> {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }
  const stripe = getStripe()
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : err}` },
      { status: 400 },
    )
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = (sub.metadata.organization_id ?? '') as string
      if (!orgId) {
        return NextResponse.json({ received: true, error: 'no organization_id in subscription metadata' })
      }
      const row = subscriptionRowFromStripe(sub, orgId)
      if (row) {
        // TODO(week 13): UPSERT into `subscriptions` keyed on stripe_subscription_id.
        // await db.insert(subscriptions).values(row).onConflictDoUpdate({...})
        console.log('[stripe] sub upsert', row.stripeSubscriptionId, row.tier, row.status)
      }
      break
    }
    case 'invoice.payment_succeeded': {
      // TODO(week 13): bump subscription period, record audit_log entry.
      const invoice = event.data.object as Stripe.Invoice
      console.log('[stripe] invoice paid', invoice.id, invoice.amount_paid)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log('[stripe] invoice failed', invoice.id)
      break
    }
    case 'checkout.session.completed': {
      // TODO(week 13): mark organization as active customer, fire welcome email.
      const session = event.data.object as Stripe.Checkout.Session
      console.log('[stripe] checkout completed', session.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
