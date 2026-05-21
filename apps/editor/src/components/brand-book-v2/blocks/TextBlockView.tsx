import type { TextBlock } from '@framework/types'

/**
 * Minimal markdown render: paragraphs separated by blank lines, **bold**,
 * *italic*, `code`, and bare links. We avoid pulling a full markdown
 * parser — the surface is small and we keep formatting deliberately
 * limited so designers stay aligned with the brand voice.
 */
function renderInline(s: string): React.ReactNode {
  // Order matters: handle inline code first so its contents are not parsed.
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
  const paragraphs = block.markdown.split(/\n\s*\n/).filter(Boolean)
  return (
    <div className={`fw-bbook__text ${block.width === 'wide' ? 'is-wide' : ''}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p.trim())}</p>
      ))}
    </div>
  )
}
