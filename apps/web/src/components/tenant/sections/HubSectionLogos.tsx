import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionLogos({ brand }: { brand: BrandLoaded }) {
  return (
    <HubSection
      id="logos"
      kicker="01"
      title="Logos"
      description="Downloadable in every format. Use the variant that fits the surface."
    >
      <div className="grid grid-cols-2 gap-px bg-fw-line md:grid-cols-3">
        {brand.tokens.logos.map((logo) => (
          <div
            key={logo.r2Key}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-fw-bg p-8"
          >
            <div className="font-display text-3xl tracking-tight">{brand.name}</div>
            <div className="text-xs uppercase tracking-widest text-fw-muted">{logo.variant}</div>
          </div>
        ))}
      </div>
    </HubSection>
  )
}
