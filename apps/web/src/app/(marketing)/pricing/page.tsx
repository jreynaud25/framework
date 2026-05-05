import Link from 'next/link'

const TIERS = [
  {
    name: 'Designer',
    price: 'Free',
    cadence: '',
    bullets: ['Brand Hub authoring', 'Plugin', 'Dashboard + analytics', '30% recurring rev-share'],
    cta: 'Apply for the partner program',
    href: '/for-designers',
  },
  {
    name: 'Brand',
    price: '€99',
    cadence: '/mo',
    bullets: ['1 hub', '5 templates', '100 exports / mo', 'AI agent', 'Basic motion'],
    cta: 'Start with your brand',
    href: '/sign-up?tier=brand',
  },
  {
    name: 'Brand+',
    price: '€299',
    cadence: '/mo',
    bullets: ['Unlimited templates', 'Unlimited exports', 'Full motion', 'Integrations'],
    cta: 'Start with your brand',
    href: '/sign-up?tier=brand_plus',
  },
  {
    name: 'Studio',
    price: 'Custom',
    cadence: '',
    bullets: ['White-label', 'Multi-brand', 'SSO', 'Dedicated support'],
    cta: 'Talk to us',
    href: '/contact?topic=studio',
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-dvh px-8 py-16">
      <h1 className="font-display text-5xl tracking-tight">Pricing</h1>
      <p className="mt-4 max-w-xl text-fw-muted">
        Designers are free and earn 30% recurring on every brand they bring. Brands pay per seat as
        they grow.
      </p>
      <div className="mt-12 grid gap-px bg-fw-line md:grid-cols-4">
        {TIERS.map((t) => (
          <div key={t.name} className="bg-fw-bg p-8">
            <div className="text-xs uppercase tracking-widest text-fw-muted">{t.name}</div>
            <div className="mt-2 font-display text-4xl">
              {t.price}
              <span className="text-base text-fw-muted">{t.cadence}</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-fw-muted">
              {t.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
            <Link
              href={t.href}
              className="mt-6 inline-block rounded-full border border-fw-line px-4 py-2 text-sm hover:bg-fw-line"
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}
