import { useState } from 'react'
import type { BrandPage } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { usePageOps } from './usePageOps'

interface Props {
  /** When defined, edit mode for that page; otherwise create a new page. */
  page?: BrandPage
  onClose: () => void
  onCreated?: (page: BrandPage) => void
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'page'
}

/**
 * Modal for creating a new page or editing an existing one. Handles
 * title, slug (auto-generated from title), subtitle, parent (one level
 * of nesting), hidden flag, and delete (edit mode only).
 */
export function PageSettingsModal({ page, onClose, onCreated }: Props) {
  const { book } = useBrandBookContext()
  const ops = usePageOps()
  const isEdit = !!page

  const [title, setTitle] = useState(page?.title ?? '')
  const [slug, setSlug] = useState(page?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(false)
  const [subtitle, setSubtitle] = useState(page?.subtitle ?? '')
  const [parentId, setParentId] = useState<string | null>(page?.parentId ?? null)
  const [hidden, setHidden] = useState(page?.hidden ?? false)
  const [busy, setBusy] = useState(false)

  // Only top-level pages can be parents (no deep nesting).
  const parentOptions = book.pages
    .filter((p) => !p.parentId && (!page || p.id !== page.id))
    .sort((a, b) => a.order - b.order)

  const handleTitle = (v: string) => {
    setTitle(v)
    if (!slugTouched && !isEdit) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (isEdit) {
        await ops.updatePage(page!.id, {
          title,
          slug: slug || slugify(title),
          subtitle: subtitle || undefined,
          parentId,
          hidden,
        })
        onClose()
      } else {
        const created = await ops.createPage({
          title,
          slug: slug || slugify(title),
          subtitle: subtitle || undefined,
          parentId,
        })
        if (created) {
          onCreated?.(created)
          onClose()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!page) return
    if (!confirm(`Delete "${page.title}"? Nested pages will also be deleted.`)) return
    setBusy(true)
    const ok = await ops.deletePage(page.id)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <div className="fw-bbook-edit__modal-backdrop" onClick={onClose}>
      <div className="fw-bbook-edit__modal" onClick={(e) => e.stopPropagation()}>
        <header className="fw-bbook-edit__modal-head">
          <h2>{isEdit ? 'Page settings' : 'New page'}</h2>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <form className="fw-bbook-edit__inspector-body" onSubmit={handleSubmit}>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Title</span>
            <input
              autoFocus
              className="fw-bbook-edit__field-input"
              value={title}
              required
              onChange={(e) => handleTitle(e.target.value)}
            />
          </label>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Slug (URL)</span>
            <input
              className="fw-bbook-edit__field-input"
              value={slug}
              placeholder="auto from title"
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              pattern="[a-z0-9\-]+"
            />
          </label>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Subtitle (optional)</span>
            <textarea
              className="fw-bbook-edit__field-textarea"
              rows={2}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </label>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Parent</span>
            <select
              className="fw-bbook-edit__field-select"
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value || null)}
            >
              <option value="">— top level —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </label>
          <label className="fw-bbook-edit__field fw-bbook-edit__field--inline">
            <span className="fw-bbook-edit__field-label">Hidden from client</span>
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
          </label>

          <hr className="fw-bbook-edit__field-sep" />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            {isEdit ? (
              <button
                type="button"
                className="fw-bbook-edit__list-row button is-danger"
                onClick={handleDelete}
                disabled={busy}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--bbook-danger)',
                  color: 'var(--bbook-danger)',
                  padding: '7px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Delete page
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--bbook-line-2)',
                  color: 'var(--bbook-fg)',
                  padding: '7px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !title.trim()}
                style={{
                  background: 'var(--bbook-fg)',
                  border: 0,
                  color: 'var(--bbook-bg)',
                  padding: '7px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 13,
                }}
              >
                {busy ? '…' : isEdit ? 'Save' : 'Create page'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
