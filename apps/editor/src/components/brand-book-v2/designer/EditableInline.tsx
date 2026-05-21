import { useEffect, useRef, type ElementType } from 'react'

interface Props {
  /** Current text. Controlled — caller re-renders when the value changes. */
  value: string
  /** Called on blur if text actually changed. */
  onCommit: (next: string) => void
  /** Whether editing is active. When false, renders a plain Tag with value. */
  editable: boolean
  /** Tag to render (e.g. 'h1', 'h2', 'p', 'span'). */
  as?: ElementType
  /** Pass-through className. */
  className?: string
  /** Pass-through inline styles. */
  style?: React.CSSProperties
  /** Placeholder displayed when value is empty in designer mode. */
  placeholder?: string
  /** Multi-line: keeps newlines as <br> via innerText. Default false. */
  multiline?: boolean
}

/**
 * Inline contentEditable wrapper used by block views to expose their
 * text fields directly in the page. Stops click propagation so the
 * containing BlockFrame doesn't trigger select on text focus. Commits
 * on blur — never on each keystroke — to keep PATCHing cheap.
 */
export function EditableInline({
  value,
  onCommit,
  editable,
  as: Tag = 'span',
  className,
  style,
  placeholder,
  multiline = false,
}: Props) {
  const ref = useRef<HTMLElement>(null)

  // Keep the DOM in sync if the underlying value changes (e.g. patched
  // from elsewhere). We only write into the node when the rendered text
  // diverges to avoid clobbering the caret while typing.
  useEffect(() => {
    if (!ref.current) return
    if (!editable) return
    const current = multiline ? ref.current.innerText : ref.current.textContent ?? ''
    if (current !== value) {
      ref.current.innerText = value
    }
  }, [value, editable, multiline])

  if (!editable) {
    const Plain = Tag
    return (
      <Plain className={className} style={style}>
        {value || (placeholder ?? '')}
      </Plain>
    )
  }

  const TagEditable = Tag
  return (
    <TagEditable
      ref={ref}
      className={`fw-bbook-edit__inline ${className ?? ''} ${!value ? 'is-empty' : ''}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ''}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = (multiline ? e.currentTarget.innerText : e.currentTarget.textContent ?? '').trim()
        if (next !== value) onCommit(next)
      }}
    >
      {value}
    </TagEditable>
  )
}
