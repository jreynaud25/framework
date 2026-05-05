import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionImagery({ brand }: { brand: BrandLoaded }) {
  if (!brand.tokens.imagery) return null
  const i = brand.tokens.imagery
  return (
    <HubSection id="imagery" kicker="07" title="Imagery" description="What photos go on brand.">
      <div className="grid gap-px bg-fw-line md:grid-cols-2">
        <div className="bg-fw-bg p-6">
          <div className="text-xs uppercase tracking-widest text-fw-muted">Do</div>
          <ul className="mt-3 space-y-1 text-sm">
            {i.dos.map((d) => (
              <li key={d}>+ {d}</li>
            ))}
          </ul>
        </div>
        <div className="bg-fw-bg p-6">
          <div className="text-xs uppercase tracking-widest text-fw-muted">Don't</div>
          <ul className="mt-3 space-y-1 text-sm text-fw-muted">
            {i.donts.map((d) => (
              <li key={d}>− {d}</li>
            ))}
          </ul>
        </div>
      </div>
    </HubSection>
  )
}
