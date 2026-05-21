import type { SectionBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { useCurrentPageId } from '../currentPageContext'
import { useBlockOps } from '../designer/useBlockOps'
import { EditableInline } from '../designer/EditableInline'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Anchor + visual divider for a sub-section. Title + subtitle are
 * inline-editable in designer mode.
 */
export function SectionBlockView({ block }: { block: SectionBlock }) {
  const { designerEnabled } = useBrandBookContext()
  const pageId = useCurrentPageId()
  const { updateBlock } = useBlockOps()
  const editable = designerEnabled && !!pageId
  const anchor = block.anchor ?? slugify(block.title)

  return (
    <div className="fw-bbook__section-head" id={anchor}>
      <EditableInline
        as="h2"
        value={block.title}
        editable={editable}
        placeholder="Section title"
        className="fw-bbook__eyebrow"
        onCommit={(next) => pageId && updateBlock(pageId, block.id, { title: next })}
      />
      {block.subtitle || editable ? (
        <EditableInline
          as="p"
          value={block.subtitle ?? ''}
          editable={editable}
          multiline
          placeholder="Subtitle (optional)"
          className="fw-bbook__subtitle"
          onCommit={(next) =>
            pageId && updateBlock(pageId, block.id, { subtitle: next || undefined })
          }
        />
      ) : null}
    </div>
  )
}
