import type { CopyExamplesBlock } from '@framework/types'

export function CopyExamplesBlockView({ block }: { block: CopyExamplesBlock }) {
  if (block.pairs.length === 0) return null
  return (
    <div className="fw-bbook__copy-pairs">
      {block.pairs.map((p, i) => (
        <div key={i} className="fw-bbook__copy-pair">
          <div className="fw-bbook__copy-side is-before">
            <span className="fw-bbook__copy-tag">Before</span>
            <p>{p.before}</p>
          </div>
          <div className="fw-bbook__copy-side is-after">
            <span className="fw-bbook__copy-tag">After</span>
            <p>{p.after}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
