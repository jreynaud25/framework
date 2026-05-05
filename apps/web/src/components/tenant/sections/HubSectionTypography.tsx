import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionTypography({ brand }: { brand: BrandLoaded }) {
  const roles = Object.entries(brand.tokens.typography)
  return (
    <HubSection
      id="typography"
      kicker="03"
      title="Typography"
      description="Roles and scale. The slot system uses these names everywhere."
    >
      <div className="space-y-px bg-fw-line">
        {roles.map(([role, entry]) => (
          <div key={role} className="bg-fw-bg p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-fw-muted">{role}</div>
                <div className="mt-1 text-sm">
                  {entry.fontFamily} · {entry.weights.join(' / ')}
                </div>
              </div>
              <div className="font-mono text-xs text-fw-muted">
                {entry.scale.map((s) => `${s}px`).join(' ')}
              </div>
            </div>
            <p
              className="mt-4 max-w-3xl"
              style={{
                fontFamily: entry.fontFamily,
                fontWeight: entry.defaultWeight,
                fontSize: entry.scale[0],
                lineHeight: entry.lineHeight,
                letterSpacing: entry.letterSpacing,
              }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
        ))}
      </div>
    </HubSection>
  )
}
