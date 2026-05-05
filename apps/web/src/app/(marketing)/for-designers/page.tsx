import Link from 'next/link'

export default function ForDesignersPage() {
  return (
    <main className="min-h-dvh px-8 py-16">
      <h1 className="max-w-3xl font-display text-5xl tracking-tight md:text-6xl">
        Your Figma file. Your brand identity. Your client's hands — without breaking either.
      </h1>
      <p className="mt-6 max-w-xl text-fw-muted">
        Push your design from Figma. Your client edits the content in a Canva-grade interface. Every
        export stays inside the system you authored. You take 30% of every brand you bring, recurring.
      </p>
      <div className="mt-12 grid gap-px bg-fw-line md:grid-cols-3">
        {[
          {
            title: 'You author',
            body: 'You design every template in Figma. The plugin walks the file and emits a serializable schema.',
          },
          {
            title: 'They edit',
            body: 'Brand clients edit text, images, and palette colors in real time. Locked layout. Locked typography.',
          },
          {
            title: 'You earn',
            body: '30% of every Brand and Brand+ subscription, recurring. Your dashboard shows referral pipeline + payouts.',
          },
        ].map((b) => (
          <div key={b.title} className="bg-fw-bg p-8">
            <div className="font-display text-2xl">{b.title}</div>
            <p className="mt-3 text-sm text-fw-muted">{b.body}</p>
          </div>
        ))}
      </div>
      <Link
        href="/sign-up?as=designer"
        className="mt-12 inline-block rounded-full bg-fw-fg px-6 py-3 text-sm font-medium text-fw-bg hover:opacity-90"
      >
        Join the partner program
      </Link>
    </main>
  )
}
