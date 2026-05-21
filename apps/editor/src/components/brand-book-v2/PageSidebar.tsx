import { Link } from '@tanstack/react-router'
import type { BrandPage } from '@framework/types'
import { pageFullPath } from '@framework/types'

interface Props {
  pages: BrandPage[]
  currentFullPath: string
  brandSlug: string
  designerEnabled: boolean
}

/**
 * Vevo-style left sidebar. Top-level pages render as a flat list; nested
 * pages appear indented under their parent. Hidden pages only show in
 * designer mode (with a "hidden" badge).
 */
export function PageSidebar({ pages, currentFullPath, brandSlug, designerEnabled }: Props) {
  const visible = pages.filter((p) => designerEnabled || !p.hidden)
  const topLevel = visible
    .filter((p) => !p.parentId)
    .sort((a, b) => a.order - b.order)

  return (
    <nav className="fw-bbook__nav" aria-label="Brand book sections">
      {topLevel.map((page) => {
        const fullPath = pageFullPath(page, pages)
        const isActive = currentFullPath === fullPath
        const isParent = currentFullPath.startsWith(`${fullPath}/`)
        const children = visible
          .filter((p) => p.parentId === page.id)
          .sort((a, b) => a.order - b.order)
        return (
          <div key={page.id} className="fw-bbook__nav-group">
            <Link
              to="/b/$brandSlug/guidelines/$pageSlug"
              params={{ brandSlug, pageSlug: page.slug }}
              search={designerEnabled ? { designer: '1' as const } : undefined}
              className={`fw-bbook__nav-item ${isActive ? 'is-active' : ''} ${
                isParent ? 'is-parent' : ''
              }`}
            >
              <span className="fw-bbook__nav-label">{page.title}</span>
              {page.hidden ? <span className="fw-bbook__nav-badge">hidden</span> : null}
            </Link>
            {children.length > 0 && (isActive || isParent) ? (
              <div className="fw-bbook__nav-children">
                {children.map((child) => {
                  const childPath = pageFullPath(child, pages)
                  return (
                    <Link
                      key={child.id}
                      to="/b/$brandSlug/guidelines/$pageSlug/$childSlug"
                      params={{ brandSlug, pageSlug: page.slug, childSlug: child.slug }}
                      search={designerEnabled ? { designer: '1' as const } : undefined}
                      className={`fw-bbook__nav-item fw-bbook__nav-item--child ${
                        currentFullPath === childPath ? 'is-active' : ''
                      }`}
                    >
                      <span className="fw-bbook__nav-label">{child.title}</span>
                      {child.hidden ? (
                        <span className="fw-bbook__nav-badge">hidden</span>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
