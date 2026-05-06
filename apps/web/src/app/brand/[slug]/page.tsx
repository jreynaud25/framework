import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TenantHub } from '@/components/tenant/TenantHub'
import { loadBrandBySlug } from '@/server/brand'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * Apex-route preview of the Brand Hub, identical to what
 * `{slug}.{APP_HOST}` renders. Useful to show what brands see when they
 * connect, without juggling the localhost subdomain.
 *
 * Wraps TenantHub in a thin "viewing as brand" banner so it's obvious
 * we're in a preview surface, not the real tenant subdomain.
 */
export default async function BrandPreview({ params }: Props) {
  const { slug } = await params
  const brand = await loadBrandBySlug(slug)
  if (!brand) notFound()

  const subdomainUrl =
    process.env.NEXT_PUBLIC_APP_HOST === 'localhost'
      ? `http://${slug}.localhost:3000`
      : process.env.NEXT_PUBLIC_APP_HOST
        ? `https://${slug}.${process.env.NEXT_PUBLIC_APP_HOST}`
        : `https://${slug}.frame-work.app`

  return (
    <div>
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-fw-line bg-fw-bg/80 px-6 py-2 text-xs backdrop-blur">
        <div className="flex items-center gap-3 text-fw-muted">
          <span className="rounded-full bg-fw-line px-2 py-0.5 uppercase tracking-widest">
            Preview
          </span>
          <span>
            Viewing <strong className="text-fw-fg">{brand.name}</strong> as a brand client
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={subdomainUrl}
            className="text-fw-muted hover:text-fw-fg"
            title="Open the real tenant subdomain"
          >
            {subdomainUrl.replace(/^https?:\/\//, '')} →
          </a>
          <Link href="/" className="text-fw-muted hover:text-fw-fg">
            Exit preview
          </Link>
        </div>
      </div>

      <TenantHub slug={slug} />
    </div>
  )
}
