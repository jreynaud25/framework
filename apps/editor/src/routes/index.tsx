import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <main className="grid place-items-center p-12">
      <div className="max-w-md text-center">
        <h1 className="text-3xl tracking-tight">Editor</h1>
        <p className="mt-3 text-[var(--muted)]">Open a composition to start editing.</p>
        <Link
          to="/c/$compositionId"
          params={{ compositionId: 'demo' }}
          className="mt-6 inline-block rounded-full border border-[var(--line)] px-4 py-2 text-sm hover:bg-[var(--line)]"
        >
          Open demo composition →
        </Link>
      </div>
    </main>
  )
}
