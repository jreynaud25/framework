import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { BrandPage } from '@framework/types'
import { pageFullPath } from '@framework/types'
import { PageSettingsModal } from './designer/PageSettingsModal'

interface Props {
  pages: BrandPage[]
  currentFullPath: string
  brandSlug: string
  designerEnabled: boolean
}

/**
 * Vevo-style left sidebar. Top-level pages render as a flat list; nested
 * pages appear indented under their parent. Hidden pages only show in
 * designer mode (with a "hidden" badge). In designer mode, a settings
 * gear appears on hover and a "+ New page" button anchors the bottom.
 */
export function PageSidebar({ pages, currentFullPath, brandSlug, designerEnabled }: Props) {
  const visible = pages.filter((p) => designerEnabled || !p.hidden)
  const topLevel = visible
    .filter((p) => !p.parentId)
    .sort((a, b) => a.order - b.order)
  const [editingPage, setEditingPage] = useState<BrandPage | null>(null)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  return (
    <>
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
              <div className="fw-bbook__nav-row">
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
                {designerEnabled ? (
                  <button
                    type="button"
                    className="fw-bbook__nav-gear"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setEditingPage(page)
                    }}
                    title="Page settings"
                  >
                    ⚙
                  </button>
                ) : null}
              </div>
              {children.length > 0 && (isActive || isParent) ? (
                <div className="fw-bbook__nav-children">
                  {children.map((child) => {
                    const childPath = pageFullPath(child, pages)
                    return (
                      <div key={child.id} className="fw-bbook__nav-row">
                        <Link
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
                        {designerEnabled ? (
                          <button
                            type="button"
                            className="fw-bbook__nav-gear"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setEditingPage(child)
                            }}
                            title="Page settings"
                          >
                            ⚙
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}

        {designerEnabled ? (
          <button
            type="button"
            className="fw-bbook__nav-add"
            onClick={() => setCreating(true)}
            title="Add a new page"
          >
            + New page
          </button>
        ) : null}
      </nav>

      {editingPage ? (
        <PageSettingsModal
          page={editingPage}
          onClose={() => setEditingPage(null)}
        />
      ) : null}
      {creating ? (
        <PageSettingsModal
          onClose={() => setCreating(false)}
          onCreated={(page) => {
            // After create, navigate to it (handles top-level + nested).
            if (page.parentId) {
              const parent = pages.find((p) => p.id === page.parentId)
              if (parent) {
                void navigate({
                  to: '/b/$brandSlug/guidelines/$pageSlug/$childSlug',
                  params: { brandSlug, pageSlug: parent.slug, childSlug: page.slug },
                  search: { designer: '1' as const },
                })
              }
            } else {
              void navigate({
                to: '/b/$brandSlug/guidelines/$pageSlug',
                params: { brandSlug, pageSlug: page.slug },
                search: { designer: '1' as const },
              })
            }
          }}
        />
      ) : null}
    </>
  )
}
