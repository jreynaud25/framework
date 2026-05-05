import Link from 'next/link'
import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionTemplates({ brand }: { brand: BrandLoaded }) {
  return (
    <HubSection
      id="templates"
      kicker="04"
      title="Templates"
      description="Authored in Figma by the brand's designer. Edit, export, ship."
    >
      <div className="grid grid-cols-1 gap-px bg-fw-line md:grid-cols-2">
        {brand.templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${tpl.slug}`}
            className="group relative aspect-[4/3] overflow-hidden bg-fw-bg p-6"
          >
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-2xl">{tpl.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-fw-muted">
                    {tpl.formats.join(' · ')}
                  </div>
                </div>
                {tpl.isNew ? (
                  <span className="rounded-full bg-fw-fg px-2 py-0.5 text-[10px] uppercase tracking-widest text-fw-bg">
                    New
                  </span>
                ) : null}
              </div>
              <div className="text-sm text-fw-muted group-hover:text-fw-fg">Open editor →</div>
            </div>
          </Link>
        ))}
      </div>
    </HubSection>
  )
}
