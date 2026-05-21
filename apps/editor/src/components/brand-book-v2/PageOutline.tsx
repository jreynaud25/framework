import type { BrandPage } from '@framework/types'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface Props {
  page: BrandPage
}

/**
 * Right-rail TOC built from `section` blocks on the current page. Sticky,
 * shows only when the page has ≥2 sections (otherwise the page is short
 * enough that the outline adds no value). Anchors match SectionBlockView.
 */
export function PageOutline({ page }: Props) {
  const sections = page.blocks
    .filter((b) => b.kind === 'section')
    .map((b) => {
      const sec = b as Extract<typeof page.blocks[number], { kind: 'section' }>
      return { id: sec.id, anchor: sec.anchor ?? slugify(sec.title), title: sec.title }
    })
  if (sections.length < 2) return null

  return (
    <nav className="fw-bbook__outline print:hidden" aria-label="On this page">
      <span className="fw-bbook__outline-label">On this page</span>
      <ul>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.anchor}`}>{s.title}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
