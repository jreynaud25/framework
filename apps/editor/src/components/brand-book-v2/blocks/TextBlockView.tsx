import type { TextBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { useCurrentPageId } from '../currentPageContext'
import { useBlockOps } from '../designer/useBlockOps'
import { EditableInline } from '../designer/EditableInline'

/**
 * Minimal markdown render: paragraphs separated by blank lines, **bold**,
 * *italic*, `code`, and bare links. We avoid pulling a full markdown
 * parser — the surface is small and we keep formatting deliberately
 * limited so designers stay aligned with the brand voice.
 *
 * In designer mode, the raw markdown is exposed as a single contentEditable
 * region; inline formatting is preserved literally (no WYSIWYG marks).
 */
function renderInline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let rest = s
  let key = 0
  const patterns: { re: RegExp; render: (m: RegExpExecArray) => React.ReactNode }[] = [
    { re: /`([^`]+)`/, render: (m) => <code key={key++}>{m[1]}</code> },
    { re: /\*\*([^*]+)\*\*/, render: (m) => <strong key={key++}>{m[1]}</strong> },
    { re: /\*([^*]+)\*/, render: (m) => <em key={key++}>{m[1]}</em> },
  ]
  outer: while (rest) {
    for (const { re, render } of patterns) {
      const m = re.exec(rest)
      if (m && m.index !== undefined) {
        if (m.index > 0) parts.push(rest.slice(0, m.index))
        parts.push(render(m))
        rest = rest.slice(m.index + m[0].length)
        continue outer
      }
    }
    parts.push(rest)
    break
  }
  return parts
}

export function TextBlockView({ block }: { block: TextBlock }) {
  const { designerEnabled } = useBrandBookContext()
  const pageId = useCurrentPageId()
  const { updateBlock } = useBlockOps()
  const editable = designerEnabled && !!pageId

  if (editable) {
    // In designer mode, edit the raw markdown source as one block so
    // formatting markers survive the round-trip. Rendered formatting is
    // applied on next save / when designer leaves edit mode.
    return (
      <EditableInline
        as="div"
        value={block.markdown}
        editable
        multiline
        placeholder="Edit text — supports **bold**, *italic*, `code`"
        className={`fw-bbook__text fw-bbook__text--editing ${block.width === 'wide' ? 'is-wide' : ''}`}
        onCommit={(next) => pageId && updateBlock(pageId, block.id, { markdown: next })}
      />
    )
  }

  const paragraphs = block.markdown.split(/\n\s*\n/).filter(Boolean)
  return (
    <div className={`fw-bbook__text ${block.width === 'wide' ? 'is-wide' : ''}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p.trim())}</p>
      ))}
    </div>
  )
}
