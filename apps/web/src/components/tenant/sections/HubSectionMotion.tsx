import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionMotion({ brand }: { brand: BrandLoaded }) {
  if (!brand.tokens.motion) return null
  const m = brand.tokens.motion
  return (
    <HubSection id="motion" kicker="05" title="Motion" description="How the brand moves.">
      <div className="grid gap-px bg-fw-line md:grid-cols-3">
        <div className="bg-fw-bg p-6">
          <div className="text-xs uppercase tracking-widest text-fw-muted">Durations</div>
          <ul className="mt-3 space-y-1 font-mono text-sm">
            <li>fast · {m.durations.fast}ms</li>
            <li>base · {m.durations.base}ms</li>
            <li>slow · {m.durations.slow}ms</li>
          </ul>
        </div>
        <div className="bg-fw-bg p-6">
          <div className="text-xs uppercase tracking-widest text-fw-muted">Easings</div>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            <li>default {m.easings.default}</li>
            <li>emphasized {m.easings.emphasized}</li>
          </ul>
        </div>
        <div className="bg-fw-bg p-6">
          <div className="text-xs uppercase tracking-widest text-fw-muted">Principles</div>
          <ul className="mt-3 space-y-1 text-sm">
            {m.principles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </HubSection>
  )
}
