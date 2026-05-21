import type { CalloutBlock } from '@framework/types'

const ICON = {
  info: 'i',
  do: '✓',
  dont: '✕',
  warn: '!',
} as const

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <div className={`fw-bbook__callout fw-bbook__callout--${block.tone}`}>
      <span className="fw-bbook__callout-icon" aria-hidden>
        {ICON[block.tone]}
      </span>
      <div className="fw-bbook__callout-body">
        {block.title ? <strong>{block.title}</strong> : null}
        <p>{block.body}</p>
      </div>
    </div>
  )
}
