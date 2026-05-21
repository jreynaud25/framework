import type { ToneChipsBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

export function ToneChipsBlockView({ block }: { block: ToneChipsBlock }) {
  const { tokens } = useBrandBookContext()
  const chips = block.chips ?? tokens.voice?.tone ?? []
  if (chips.length === 0) {
    return <div className="fw-bbook__empty">No tone words yet. Add them on the Voice page.</div>
  }
  return (
    <div className="fw-bbook__chips">
      {chips.map((c, i) => (
        <span key={i} className="fw-bbook__chip">{c}</span>
      ))}
    </div>
  )
}
