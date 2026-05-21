import type { HeadingBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

export function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const { tokens } = useBrandBookContext()
  const font = tokens.typography.heading?.fontFamily ?? tokens.typography.body.fontFamily
  const Tag = (`h${block.level}` as 'h2' | 'h3' | 'h4')
  return (
    <Tag className={`fw-bbook__heading fw-bbook__heading--${block.level}`} style={{ fontFamily: font }}>
      {block.text}
    </Tag>
  )
}
