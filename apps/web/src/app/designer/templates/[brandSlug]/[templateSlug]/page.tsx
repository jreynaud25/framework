import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTemplate } from '@/server/designer/store'
import { SlotConfigPanel } from './_components/SlotConfigPanel'
import { CommentsThread } from './_components/CommentsThread'
import { DangerZone } from './_components/DangerZone'

interface Props {
  params: Promise<{ brandSlug: string; templateSlug: string }>
}

export const dynamic = 'force-dynamic'

export default async function DesignerTemplateDetailPage({ params }: Props) {
  const { brandSlug, templateSlug } = await params
  const tpl = getTemplate(brandSlug, templateSlug)
  if (!tpl) notFound()

  const open = tpl.comments.filter((c) => c.status === 'open').length

  return (
    <main className="min-h-dvh px-8 py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <Link
            href="/designer"
            className="text-xs uppercase tracking-widest text-fw-muted hover:text-fw-fg"
          >
            ← Designer dashboard
          </Link>
          <h1 className="mt-2 font-display text-4xl tracking-tight">{tpl.name}</h1>
          <p className="mt-1 text-sm text-fw-muted">
            {tpl.brandName} · {tpl.formats.join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {open > 0 ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
              {open} open comment{open === 1 ? '' : 's'}
            </span>
          ) : null}
          <Link
            href={`/templates/${tpl.brandSlug}`}
            className="rounded-full border border-fw-line px-3 py-1 text-xs text-fw-muted hover:bg-fw-line hover:text-fw-fg"
          >
            Preview as brand →
          </Link>
        </div>
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-12">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl tracking-tight">Editable slots</h2>
              <span className="text-xs text-fw-muted">
                What the brand client can change
              </span>
            </div>
            <p className="mt-2 text-sm text-fw-muted">
              Mark a slot as locked to remove it from the brand client editor entirely. Adjust
              max characters, palette-only colors, and required flags here.
            </p>
            <div className="mt-6">
              <SlotConfigPanel
                brandSlug={tpl.brandSlug}
                templateSlug={tpl.slug}
                slots={tpl.slots}
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl tracking-tight">Client comments</h2>
            <p className="mt-2 text-sm text-fw-muted">
              Pinned to specific slots in the editor. Reply, mark as addressed, or push a Figma
              update to auto-resolve.
            </p>
            <div className="mt-6">
              <CommentsThread
                brandSlug={tpl.brandSlug}
                templateSlug={tpl.slug}
                comments={tpl.comments}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <Meta label="Published" value={new Date(tpl.publishedAt).toLocaleDateString()} />
          <Meta label="Slots" value={`${tpl.slots.length}`} />
          <Meta
            label="Open comments"
            value={`${open}`}
            tone={open > 0 ? 'amber' : 'muted'}
          />

          <DangerZone brandSlug={tpl.brandSlug} templateSlug={tpl.slug} templateName={tpl.name} />
        </aside>
      </div>
    </main>
  )
}

function Meta({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'amber' | 'muted'
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-fw-muted">{label}</div>
      <div
        className={
          'mt-1 ' +
          (tone === 'amber'
            ? 'text-amber-300'
            : tone === 'muted'
              ? 'text-fw-muted'
              : 'text-fw-fg')
        }
      >
        {value}
      </div>
    </div>
  )
}
