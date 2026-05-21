import type { DividerBlock } from '@framework/types'

export function DividerBlockView({ block }: { block: DividerBlock }) {
  if (block.style === 'space') return <div className="fw-bbook__divider-space" />
  return <hr className="fw-bbook__divider-line" />
}
