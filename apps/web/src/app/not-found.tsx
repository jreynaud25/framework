import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-8">
      <div className="text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-fw-muted">404</div>
        <h1 className="mt-4 font-display text-5xl tracking-tight">Page not found</h1>
        <p className="mt-3 text-fw-muted">The page you're looking for doesn't exist.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-fw-line px-5 py-2 text-sm hover:bg-fw-line"
        >
          Back home
        </Link>
      </div>
    </main>
  )
}
