import 'server-only'
import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is required')
    stripe = new Stripe(key, {
      apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion,
      appInfo: { name: 'Framework', url: 'https://frame-work.app' },
    })
  }
  return stripe
}

/** Map a Stripe price ID → our subscription_tier enum. */
export function tierForPriceId(priceId: string): 'brand' | 'brand_plus' | 'studio' | 'enterprise' | null {
  if (priceId === process.env.STRIPE_PRICE_BRAND) return 'brand'
  if (priceId === process.env.STRIPE_PRICE_BRAND_PLUS) return 'brand_plus'
  if (priceId === process.env.STRIPE_PRICE_STUDIO) return 'studio'
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'enterprise'
  return null
}
