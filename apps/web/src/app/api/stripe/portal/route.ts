import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/server/stripe/client'

/**
 * POST /api/stripe/portal
 *
 * Returns a Stripe Customer Portal URL for the requesting org's admin to
 * manage their subscription (BRIEF §4: "Stripe Customer Portal = zero-code
 * billing UX").
 *
 * Body: { customerId, returnUrl? }
 *
 * Authorization (TODO week 13): ensure the calling Clerk user is admin
 * of the org that owns this customer_id.
 */
const Body = z.object({
  customerId: z.string(),
  returnUrl: z.string().url().optional(),
})

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 422 })

  const session = await getStripe().billingPortal.sessions.create({
    customer: parsed.data.customerId,
    return_url:
      parsed.data.returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://frame-work.app'}/account`,
  })

  return NextResponse.json({ url: session.url })
}
