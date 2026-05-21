import type { HeadingBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { useCurrentPageId } from '../currentPageContext'
import { useBlockOps } from '../designer/useBlockOps'
import { EditableInline } from '../designer/EditableInline'

export function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const { tokens, designerEnabled } = useBrandBookContext()
  const pageId = useCurrentPageId()
  const { updateBlock } = useBlockOps()
  const editable = designerEnabled && !!pageId
  const font = tokens.typography.heading?.fontFamily ?? tokens.typography.body.fontFamily
  const Tag = (`h${block.level}` as 'h2' | 'h3' | 'h4')

  return (
    <EditableInline
      as={Tag}
      value={block.text}
      editable={editable}
      placeholder={`Heading ${block.level}`}
      className={`fw-bbook__heading fw-bbook__heading--${block.level}`}
      style={{ fontFamily: font }}
      onCommit={(next) => pageId && updateBlock(pageId, block.id, { text: next })}
    />
  )
}
