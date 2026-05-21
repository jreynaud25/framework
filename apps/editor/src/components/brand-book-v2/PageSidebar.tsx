import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { BrandPage } from '@framework/types'
import { pageFullPath } from '@framework/types'
import { useBrandContext, type BrandRecord } from '../brandContext'
import { useBrandBookContext } from './brandBookContext'
import { PageSettingsModal } from './designer/PageSettingsModal'
import { BrandSettingsModal } from './designer/BrandSettingsModal'
import { usePageOps } from './designer/usePageOps'

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

function ago(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return `${h}h ago`
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
  const [editingBrand, setEditingBrand] = useState(false)
  const [shareFlash, setShareFlash] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; above: boolean } | null>(null)
  const { reloadBrand } = useBrandContext()
  const { saving, lastSavedAt, canUndo, undo } = useBrandBookContext()
  const { reorderPages } = usePageOps()
  const navigate = useNavigate()
  // Tick every 5s so "Saved 12s ago" updates without manual re-renders.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!lastSavedAt) return
    const id = window.setInterval(() => setTick((t) => t + 1), 5000)
    return () => window.clearInterval(id)
  }, [lastSavedAt])
  const search = designerEnabled ? { designer: '1' as const } : undefined

  /** Reorder helper: handle a drop given source + target within a sibling group. */
  const handleDrop = (
    parentId: string | null,
    siblings: BrandPage[],
    targetId: string,
    above: boolean,
    draggedId: string,
  ) => {
    if (draggedId === targetId) return
    const fromIdx = siblings.findIndex((p) => p.id === draggedId)
    if (fromIdx === -1) return
    const targetIdx = siblings.findIndex((p) => p.id === targetId)
    if (targetIdx === -1) return
    let insertAt = above ? targetIdx : targetIdx + 1
    if (fromIdx < insertAt) insertAt -= 1
    if (insertAt === fromIdx) return
    const next = [...siblings]
    const [moved] = next.splice(fromIdx, 1)
    if (moved) next.splice(insertAt, 0, moved)
    void reorderPages({ parentId, orderedSiblings: next, bookPages: pages })
  }

  /** Drag handlers factory for a page row in a given sibling group. */
  const dragHandlersFor = (page: BrandPage, siblings: BrandPage[], parentId: string | null) => ({
    draggable: designerEnabled,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', page.id)
      e.dataTransfer.setData('application/x-fw-page-parent', String(parentId ?? ''))
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragOver: (e: React.DragEvent) => {
      const fromParent = e.dataTransfer.types.includes('application/x-fw-page-parent')
      if (!fromParent) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const above = e.clientY < rect.top + rect.height / 2
      setDropTarget({ id: page.id, above })
    },
    onDragLeave: () => setDropTarget((d) => (d?.id === page.id ? null : d)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData('text/plain')
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const above = e.clientY < rect.top + rect.height / 2
      setDropTarget(null)
      handleDrop(parentId, siblings, page.id, above, draggedId)
    },
  })

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
        <button
          type="button"
          className="fw-bbook__brand-head-name-row"
          onClick={() => designerEnabled && brand && setEditingBrand(true)}
          disabled={!designerEnabled || !brand}
          title={designerEnabled ? 'Edit brand settings' : undefined}
        >
          {brand?.primaryColor ? (
            <span
              className="fw-bbook__brand-head-dot"
              style={{ background: brand.primaryColor }}
              aria-hidden
            />
          ) : null}
          <span className="fw-bbook__brand-head-name">{brand?.name ?? brandSlug}</span>
          {designerEnabled && brand ? (
            <span className="fw-bbook__brand-head-edit" aria-hidden>✎</span>
          ) : null}
        </button>
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
          {designerEnabled ? (
            <button
              type="button"
              className="fw-bbook__brand-head-btn"
              disabled={!canUndo || saving}
              onClick={() => void undo()}
              title={canUndo ? 'Undo last change (⌘Z)' : 'Nothing to undo'}
            >
              ↶ Undo
            </button>
          ) : null}
        </div>
        {designerEnabled ? (
          <div className="fw-bbook__save-state">
            {saving
              ? <><span className="fw-bbook__save-dot is-saving" />Saving…</>
              : lastSavedAt
                ? <><span className="fw-bbook__save-dot is-saved" />Saved {ago(lastSavedAt)}</>
                : <><span className="fw-bbook__save-dot" />Up to date</>}
          </div>
        ) : null}
      </header>

      <nav className="fw-bbook__nav" aria-label="Brand book sections">
        {topLevel.map((page) => {
          const fullPath = pageFullPath(page, pages)
          const isActive = currentFullPath === fullPath
          const isParent = currentFullPath.startsWith(`${fullPath}/`)
          const children = visible
            .filter((p) => p.parentId === page.id)
            .sort((a, b) => a.order - b.order)
          const dropHere = dropTarget?.id === page.id ? dropTarget.above ? 'above' : 'below' : null
          return (
            <div key={page.id} className="fw-bbook__nav-group">
              <div
                className={`fw-bbook__nav-row ${dropHere ? `is-drop-${dropHere}` : ''}`}
                {...dragHandlersFor(page, topLevel, null)}
              >
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
                    const childDrop =
                      dropTarget?.id === child.id ? (dropTarget.above ? 'above' : 'below') : null
                    return (
                      <div
                        key={child.id}
                        className={`fw-bbook__nav-row ${childDrop ? `is-drop-${childDrop}` : ''}`}
                        {...dragHandlersFor(child, children, page.id)}
                      >
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
          className={`fw-bbook__nav-templates-link ${
            currentFullPath === '__templates' ? 'is-active' : ''
          }`}
        >
          <span>Templates</span>
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
      {editingBrand && brand ? (
        <BrandSettingsModal
          brand={brand}
          onClose={() => setEditingBrand(false)}
          onSaved={() => void reloadBrand()}
        />
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
