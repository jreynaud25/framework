import { HubSection } from './HubSection'
import type { BrandLoaded } from '@/server/brand'

export function HubSectionVoice({ brand }: { brand: BrandLoaded }) {
  if (!brand.tokens.voice) return null
  const v = brand.tokens.voice
  return (
    <HubSection id="voice" kicker="06" title="Voice" description="How the brand sounds.">
      <div className="grid gap-px bg-fw-line md:grid-cols-3">
        <Card title="Tone" items={v.tone} />
        <Card title="Preferred" items={v.vocabulary.preferred} />
        <Card title="Avoid" items={[...v.vocabulary.avoid, ...v.forbidden]} />
      </div>
    </HubSection>
  )
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-fw-bg p-6">
      <div className="text-xs uppercase tracking-widest text-fw-muted">{title}</div>
      <ul className="mt-3 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
