import type { CalloutBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { useCurrentPageId } from '../currentPageContext'
import { useBlockOps } from '../designer/useBlockOps'
import { EditableInline } from '../designer/EditableInline'

const ICON = {
  info: 'i',
  do: '✓',
  dont: '✕',
  warn: '!',
} as const

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  const { designerEnabled } = useBrandBookContext()
  const pageId = useCurrentPageId()
  const { updateBlock } = useBlockOps()
  const editable = designerEnabled && !!pageId

  return (
    <div className={`fw-bbook__callout fw-bbook__callout--${block.tone}`}>
      <span className="fw-bbook__callout-icon" aria-hidden>
        {ICON[block.tone]}
      </span>
      <div className="fw-bbook__callout-body">
        {block.title || editable ? (
          <EditableInline
            as="strong"
            value={block.title ?? ''}
            editable={editable}
            placeholder="Title (optional)"
            onCommit={(next) =>
              pageId && updateBlock(pageId, block.id, { title: next || undefined })
            }
          />
        ) : null}
        <EditableInline
          as="p"
          value={block.body}
          editable={editable}
          multiline
          placeholder="Callout body"
          onCommit={(next) => pageId && updateBlock(pageId, block.id, { body: next })}
        />
      </div>
    </div>
  )
}
