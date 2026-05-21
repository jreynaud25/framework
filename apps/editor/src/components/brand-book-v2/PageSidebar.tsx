import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { BrandPage } from '@framework/types'
import { pageFullPath } from '@framework/types'
import type { BrandRecord } from '../brandContext'
import { PageSettingsModal } from './designer/PageSettingsModal'

interface Props {
  pages: BrandPage[]
  /** Active page's full path ('__templates' when templates view active). */
  currentFullPath: string
  brandSlug: string
  designerEnabled: boolean
  brand: BrandRecord | null
}

async function copyCurrentUrl(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`)
    return true
  } catch {
    return false
  }
}

/**
 * Vevo-style left sidebar with three regions: brand header (name + share),
 * page tree (top-level + one nested level), footer (Templates, mode toggle,
 * Studio link). In designer mode each row gets a gear-on-hover for
 * settings and a "+ New page" CTA appears below the tree.
 */
export function PageSidebar({
  pages,
  currentFullPath,
  brandSlug,
  designerEnabled,
  brand,
}: Props) {
  const visible = pages.filter((p) => designerEnabled || !p.hidden)
  const topLevel = visible
    .filter((p) => !p.parentId)
    .sort((a, b) => a.order - b.order)
  const [editingPage, setEditingPage] = useState<BrandPage | null>(null)
  const [creating, setCreating] = useState(false)
  const [shareFlash, setShareFlash] = useState<string | null>(null)
  const navigate = useNavigate()
  const search = designerEnabled ? { designer: '1' as const } : undefined

  const handleShare = async () => {
    const ok = await copyCurrentUrl()
    setShareFlash(ok ? 'Link copied' : 'Copy failed')
    window.setTimeout(() => setShareFlash(null), 1800)
  }

  return (
    <>
      <header className="fw-bbook__brand-head">
        <div className="fw-bbook__brand-head-row">
          {designerEnabled ? (
            <Link to="/d" className="fw-bbook__brand-head-back" title="Back to studio">
              ← Studio
            </Link>
          ) : (
            <span className="fw-bbook__brand-head-eyebrow">Brand</span>
          )}
        </div>
        <div className="fw-bbook__brand-head-name-row">
          {brand?.primaryColor ? (
            <span
              className="fw-bbook__brand-head-dot"
              style={{ background: brand.primaryColor }}
              aria-hidden
            />
          ) : null}
          <span className="fw-bbook__brand-head-name">{brand?.name ?? brandSlug}</span>
        </div>
        <div className="fw-bbook__brand-head-actions">
          <button
            type="button"
            className="fw-bbook__brand-head-btn"
            onClick={() => void handleShare()}
            title="Copy current URL"
          >
            {shareFlash ?? 'Share'}
          </button>
          {!designerEnabled ? (
            <button
              type="button"
              className="fw-bbook__brand-head-btn"
              onClick={() => window.print()}
              title="Print this page"
            >
              Print
            </button>
          ) : null}
        </div>
      </header>

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
                  search={search}
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
                          search={search}
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

      <div className="fw-bbook__nav-footer">
        <Link
          to="/b/$brandSlug"
          params={{ brandSlug }}
          search={search}
          className={`fw-bbook__nav-item fw-bbook__nav-templates-link ${
            currentFullPath === '__templates' ? 'is-active' : ''
          }`}
        >
          <span className="fw-bbook__nav-label">Templates</span>
          <span aria-hidden>→</span>
        </Link>
        <Link
          to="."
          search={designerEnabled ? {} : { designer: '1' as const }}
          replace
          className="fw-bbook__nav-mode"
          title={designerEnabled ? 'Switch to client view' : 'Switch to designer view'}
        >
          {designerEnabled ? '◐ Client view' : '◑ Designer view'}
        </Link>
      </div>

      {editingPage ? (
        <PageSettingsModal page={editingPage} onClose={() => setEditingPage(null)} />
      ) : null}
      {creating ? (
        <PageSettingsModal
          onClose={() => setCreating(false)}
          onCreated={(page) => {
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
