import Link from 'next/link'
import { loadBrandBySlug } from '@/server/brand'
import { HubSectionLogos } from './sections/HubSectionLogos'
import { HubSectionPalette } from './sections/HubSectionPalette'
import { HubSectionTypography } from './sections/HubSectionTypography'
import { HubSectionTemplates } from './sections/HubSectionTemplates'
import { HubSectionMotion } from './sections/HubSectionMotion'
import { HubSectionVoice } from './sections/HubSectionVoice'
import { HubSectionImagery } from './sections/HubSectionImagery'

interface Props {
  slug: string
}

export async function TenantHub({ slug }: Props) {
  const brand = await loadBrandBySlug(slug)

  const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? 'localhost'

  if (!brand) {
    return (
      <main className="min-h-dvh px-8 py-24">
        <h1 className="font-display text-4xl">Brand not found</h1>
        <p className="mt-4 text-fw-muted">
          No tenant exists at "{slug}.{appHost}".
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="font-display text-xl tracking-tight">
          {brand.name}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/templates"
            className="rounded-full border border-fw-line px-4 py-1.5 hover:bg-fw-line"
          >
            Create
          </Link>
          <Link href="/admin/fonts" className="text-fw-muted hover:text-fw-fg">
            Admin
          </Link>
        </nav>
      </header>

      <section className="px-8 pb-12 pt-12">
        <h1 className="font-display text-5xl tracking-tight md:text-7xl">{brand.name}</h1>
        <p className="mt-4 max-w-xl text-fw-muted">
          The Brand Hub. Everything {brand.name} is — colors, typography, logos, motion, voice —
          published from Figma, kept in sync.
        </p>
      </section>

      <HubSectionLogos brand={brand} />
      <HubSectionPalette brand={brand} />
      <HubSectionTypography brand={brand} />
      <HubSectionTemplates brand={brand} />
      <HubSectionMotion brand={brand} />
      <HubSectionVoice brand={brand} />
      <HubSectionImagery brand={brand} />

      <footer className="fw-hairline mt-16 px-8 py-12 text-sm text-fw-muted">
        Powered by Framework
      </footer>
    </main>
  )
}
