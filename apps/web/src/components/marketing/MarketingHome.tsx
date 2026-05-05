import Link from 'next/link'

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
          <Link
            href="/sign-in"
            className="rounded-full border border-fw-line px-4 py-1.5 text-fw-fg hover:bg-fw-fg hover:text-fw-bg"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="px-8 pb-24 pt-20">
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
        <div className="mt-12 flex items-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-full bg-fw-fg px-6 py-3 text-sm font-medium text-fw-bg hover:opacity-90"
          >
            Start with your brand
          </Link>
          <Link
            href="/for-designers"
            className="rounded-full border border-fw-line px-6 py-3 text-sm font-medium text-fw-fg hover:bg-fw-line"
          >
            I'm a designer
          </Link>
        </div>
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
