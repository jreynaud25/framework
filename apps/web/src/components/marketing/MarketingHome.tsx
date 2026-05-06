import Link from 'next/link'

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

export function MarketingHome() {
  return (
    <main className="relative min-h-dvh">
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-xl tracking-tight">
          Framework
        </Link>
        <nav className="flex items-center gap-6 text-sm text-fw-muted">
          <Link href="/pricing" className="hover:text-fw-fg">
            Pricing
          </Link>
          <Link href="/for-designers" className="hover:text-fw-fg">
            For designers
          </Link>
          {HAS_CLERK ? (
            <Link
              href="/sign-in"
              className="rounded-full border border-fw-line px-4 py-1.5 text-fw-fg hover:bg-fw-fg hover:text-fw-bg"
            >
              Sign in
            </Link>
          ) : null}
        </nav>
      </header>

      <section className="px-8 pb-16 pt-20">
        <h1 className="max-w-4xl font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Hand-crafted in Figma.
          <br />
          <span className="text-fw-muted">Edited like an AI tool.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-fw-muted">
          Framework takes the work a designer hand-crafts in Figma and gives their clients an
          interface as fast and effortless as an AI tool — but every text, image, and color edit
          stays locked inside the brand identity the designer authored.
        </p>
      </section>

      {/* Persona entry — no auth in dev. Replace with real sign-in flows later. */}
      <section className="grid grid-cols-1 gap-px bg-fw-line md:grid-cols-2">
        <Link
          href="/designer"
          className="group block bg-fw-bg p-10 transition-colors hover:bg-fw-line/50"
        >
          <div className="text-xs uppercase tracking-widest text-fw-muted">Continue as</div>
          <div className="mt-2 font-display text-3xl tracking-tight">Designer →</div>
          <p className="mt-3 max-w-md text-sm text-fw-muted">
            See the designer dashboard: brands you brought, their activity, and your share of the
            recurring revenue.
          </p>
        </Link>
        <Link
          href="/brand"
          className="group block bg-fw-bg p-10 transition-colors hover:bg-fw-line/50"
        >
          <div className="text-xs uppercase tracking-widest text-fw-muted">Continue as</div>
          <div className="mt-2 font-display text-3xl tracking-tight">Brand →</div>
          <p className="mt-3 max-w-md text-sm text-fw-muted">
            Land on the demo Brand Hub for "30 70 Agency" — colors, type, logos, templates.
            Edit, export, ship.
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-px bg-fw-line md:grid-cols-3">
        {[
          {
            kicker: 'Human-crafted',
            body:
              "Every template is a designer's eye, not a prompt. AI is a safety net, not a creator.",
          },
          {
            kicker: 'AI-fast self-serve',
            body:
              'Brand clients edit text, images and colors at one-keystroke latency. No waiting, no spinner.',
          },
          {
            kicker: 'Brand-identity locked',
            body:
              "Every output respects the designer's typography, palette, motion and voice. No drift.",
          },
        ].map((c) => (
          <div key={c.kicker} className="bg-fw-bg p-10">
            <div className="text-xs uppercase tracking-widest text-fw-muted">{c.kicker}</div>
            <p className="mt-4 text-xl">{c.body}</p>
          </div>
        ))}
      </section>

      <footer className="px-8 py-12 text-sm text-fw-muted">
        <div className="fw-hairline pt-12">
          © {new Date().getFullYear()} Framework. Designed in Paris.
        </div>
      </footer>
    </main>
  )
}
