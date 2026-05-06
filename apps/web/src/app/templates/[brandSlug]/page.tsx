import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Format } from '@framework/types'
import { loadBrandBySlug } from '@/server/brand'

const EDITOR_URL = process.env.NEXT_PUBLIC_EDITOR_URL ?? 'http://localhost:3001'

interface Props {
  params: Promise<{ brandSlug: string }>
}

/**
 * Brand-client "Create" surface — concept Scene 2:
 *
 *   "He sees a grid of templates available to him. 'Spring Drop' has a
 *    NEW badge. He clicks it. Editor opens."
 *
 * Full-page version of the Templates section on the Brand Hub.
 */
export default async function TemplatesGridPage({ params }: Props) {
  const { brandSlug } = await params
  const brand = await loadBrandBySlug(brandSlug)
  if (!brand) notFound()

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-fw-line px-6 py-3 text-sm">
        <div className="flex items-center gap-3">
          <Link href={`/brand/${brand.slug}`} className="text-fw-muted hover:text-fw-fg">
            ← {brand.name}
          </Link>
          <span className="text-fw-muted">/</span>
          <span>Create</span>
        </div>
        <Link
          href="/"
          className="rounded-full border border-fw-line px-3 py-1 text-xs text-fw-muted hover:bg-fw-line hover:text-fw-fg"
        >
          Exit
        </Link>
      </header>

      <section className="px-8 pb-8 pt-12">
        <div className="text-xs uppercase tracking-widest text-fw-muted">Create</div>
        <h1 className="mt-2 font-display text-5xl tracking-tight md:text-6xl">
          Pick a template
        </h1>
        <p className="mt-3 max-w-2xl text-fw-muted">
          Every template is a layout your designer published from Figma. Edit the text, swap the
          images, switch the format — the brand identity stays locked.
        </p>
      </section>

      {brand.templates.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="grid grid-cols-1 gap-px bg-fw-line md:grid-cols-2 lg:grid-cols-3">
          {brand.templates.map((tpl) => (
            <a
              key={tpl.id}
              href={`${EDITOR_URL}/c/${tpl.slug}?brand=${brand.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-fw-bg p-6 transition-colors hover:bg-fw-line/30"
            >
              <ThumbnailFrame brand={brand.slug} template={tpl.slug} />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-2xl">{tpl.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-fw-muted">
                      {(tpl.formats as Format[]).join(' · ')}
                    </div>
                  </div>
                  {tpl.isNew ? (
                    <span className="rounded-full bg-fw-fg px-2 py-0.5 text-[10px] uppercase tracking-widest text-fw-bg">
                      New
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-fw-muted group-hover:text-fw-fg">
                  Open editor →
                </div>
              </div>
            </a>
          ))}
        </section>
      )}

      <footer className="fw-hairline mt-16 px-8 py-12 text-sm text-fw-muted">
        Powered by Framework
      </footer>
    </main>
  )
}

function ThumbnailFrame({ brand, template }: { brand: string; template: string }) {
  const src = `/api/og/template/${template}?brand=${brand}&format=1:1`
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover opacity-30 transition-opacity group-hover:opacity-50"
    />
  )
}

function EmptyState() {
  return (
    <section className="px-8 pb-16">
      <div className="rounded-md border border-fw-line p-12 text-center">
        <div className="text-xs uppercase tracking-widest text-fw-muted">No templates yet</div>
        <p className="mt-3 max-w-md mx-auto text-fw-muted">
          Your designer hasn't published any templates yet. They'll appear here as soon as the
          first push from the Figma plugin lands.
        </p>
      </div>
    </section>
  )
}
