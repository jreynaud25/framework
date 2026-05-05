import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionPalette({ brand }: { brand: BrandLoaded }) {
  return (
    <HubSection
      id="palette"
      kicker="02"
      title="Color"
      description="Click any swatch to copy the hex."
    >
      <div className="grid grid-cols-2 gap-px bg-fw-line md:grid-cols-5">
        {brand.tokens.colors.palette.map((c) => (
          <div key={c.name} className="bg-fw-bg p-4">
            <div className="aspect-square w-full rounded-sm" style={{ background: c.hex }} />
            <div className="mt-3 text-sm">{c.name}</div>
            <div className="font-mono text-xs text-fw-muted">{c.hex}</div>
            {c.usage ? (
              <div className="mt-1 text-xs uppercase tracking-widest text-fw-muted">{c.usage}</div>
            ) : null}
          </div>
        ))}
      </div>
    </HubSection>
  )
}
