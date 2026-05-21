import type { SpacerBlock } from '@framework/types'

export function SpacerBlockView({ block }: { block: SpacerBlock }) {
  return <div style={{ height: block.height ?? 48 }} />
}
