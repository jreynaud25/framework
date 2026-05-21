import type { VocabularyBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

export function VocabularyBlockView({ block }: { block: VocabularyBlock }) {
  const { tokens } = useBrandBookContext()
  const preferred = block.preferred ?? tokens.voice?.vocabulary.preferred ?? []
  const avoid = block.avoid ?? tokens.voice?.vocabulary.avoid ?? []
  if (preferred.length === 0 && avoid.length === 0) {
    return <div className="fw-bbook__empty">No vocabulary yet. Add words on the Voice page.</div>
  }
  return (
    <div className="fw-bbook__vocab">
      <div className="fw-bbook__vocab-col">
        <h4>Preferred</h4>
        <ul>
          {preferred.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
      <div className="fw-bbook__vocab-col">
        <h4>Avoid</h4>
        <ul>
          {avoid.map((w, i) => (
            <li key={i} className="is-avoid">{w}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
