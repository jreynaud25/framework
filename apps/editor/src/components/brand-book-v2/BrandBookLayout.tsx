import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import type { BrandBook, BrandPage, BrandTokens } from '@framework/types'
import type { BrandAsset } from '../brand-book/types'
import { BrandContext, type BrandRecord } from '../brandContext'
import { toast } from '../toast'
import {
  BrandBookContext,
  type BrandBookContextValue,
  type BrandBookSelection,
} from './brandBookContext'
import { PageSidebar } from './PageSidebar'
import { BlockInspector } from './designer/BlockInspector'
import { CommandPalette } from './CommandPalette'
import { fireCommand } from './commandBus'

interface Props {
  brandSlug: string
  designerEnabled: boolean
}

const UNDO_LIMIT = 20

/**
 * The full brand shell. Mounts on /b/<slug> and owns:
 *   - brand record fetch + BrandContext (for templates view + sub-components)
 *   - book + tokens + assets fetch + BrandBookContext
 *   - left sidebar (brand header, page tree, Templates link, footer)
 *   - right Outlet — renders the current page or the Templates view
 *   - designer-mode inspector pane (when a block is selected)
 *   - saving state + undo stack + ⌘Z keyboard shortcut
 *
 * There is no separate header / max-w container above this layout; the
 * brand book IS the surface.
 */
export function BrandBookLayout({ brandSlug, designerEnabled }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const [brand, setBrand] = useState<BrandRecord | null>(null)
  const [book, setBook] = useState<BrandBook | null>(null)
  const [tokens, setTokens] = useState<BrandTokens | null>(null)
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<BrandBookSelection>({
    pageId: null,
    blockId: null,
  })
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [cmdkOpen, setCmdkOpen] = useState(false)

  // Undo stack — last N book snapshots. Pushed BEFORE each mutating call so
  // we can restore the previous state. Stored in a ref to avoid re-renders.
  const undoStackRef = useRef<BrandBook[]>([])
  const [undoVersion, setUndoVersion] = useState(0)
  const canUndo = undoStackRef.current.length > 0

  const reloadBrand = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}`)
      if (res.ok) setBrand((await res.json()) as BrandRecord)
    } catch {
      /* brand record optional — falls back to slug */
    }
  }, [brandSlug])

  const reloadBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/book`)
      if (!res.ok) throw new Error(`book HTTP ${res.status}`)
      setBook((await res.json()) as BrandBook)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(`Couldn't reload brand book: ${msg}`)
    }
  }, [brandSlug])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/brands/${encodeURIComponent(brandSlug)}`).then((r) =>
        r.ok ? r.json() : Promise.resolve(null),
      ),
      fetch(`/api/brands/${encodeURIComponent(brandSlug)}/book`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`book HTTP ${r.status}`)),
      ),
      fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`tokens HTTP ${r.status}`)),
      ),
      fetch(`/api/brands/${encodeURIComponent(brandSlug)}/assets`).then((r) =>
        r.ok ? r.json() : Promise.resolve({ assets: [] }),
      ),
    ])
      .then(
        ([br, b, t, a]: [
          BrandRecord | null,
          BrandBook,
          { tokens: BrandTokens },
          { assets: BrandAsset[] },
        ]) => {
          if (cancelled) return
          setBrand(br)
          setBook(b)
          setTokens(t.tokens)
          setAssets(a.assets)
        },
      )
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          toast.error(`Couldn't load brand: ${msg}`)
        }
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug])

  /** Push the current book onto the undo stack (call BEFORE a mutation). */
  const snapshotBook = useCallback(() => {
    if (!book) return
    undoStackRef.current.push(book)
    if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift()
    setUndoVersion((v) => v + 1)
  }, [book])

  const patchPage = useCallback(
    async (pageId: string, patch: Partial<BrandPage>) => {
      snapshotBook()
      setSaving(true)
      try {
        const res = await fetch(
          `/api/brands/${encodeURIComponent(brandSlug)}/book/pages/${encodeURIComponent(pageId)}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(patch),
          },
        )
        if (!res.ok) {
          toast.error(`Couldn't save page (HTTP ${res.status})`)
          return
        }
        const updated = (await res.json()) as BrandPage
        setBook((prev) =>
          prev
            ? { ...prev, pages: prev.pages.map((p) => (p.id === pageId ? updated : p)) }
            : prev,
        )
        setLastSavedAt(Date.now())
      } catch (err) {
        toast.error(`Network error while saving: ${err instanceof Error ? err.message : err}`)
      } finally {
        setSaving(false)
      }
    },
    [brandSlug, snapshotBook],
  )

  const patchTokens = useCallback(
    async (delta: Partial<BrandTokens>) => {
      setSaving(true)
      try {
        const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(delta),
        })
        if (!res.ok) {
          toast.error(`Couldn't save tokens (HTTP ${res.status})`)
          return
        }
        const data = (await res.json()) as { tokens: BrandTokens; versionNumber: number }
        setTokens(data.tokens)
        setLastSavedAt(Date.now())
      } catch (err) {
        toast.error(`Network error while saving tokens: ${err instanceof Error ? err.message : err}`)
      } finally {
        setSaving(false)
      }
    },
    [brandSlug],
  )

  const reloadAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/assets`)
      if (!res.ok) return
      const data = (await res.json()) as { assets: BrandAsset[] }
      setAssets(data.assets)
    } catch {
      /* keep previous assets on transient error */
    }
  }, [brandSlug])

  /**
   * Undo the most recent book mutation. Pops the last snapshot, bulk-
   * PATCHes the book pages back to that state, and refetches to sync
   * the canonical version. Page CRUD via usePageOps also benefits — its
   * reorderPages writes through PATCH /book which we can roll back here.
   */
  const undo = useCallback(async () => {
    const prev = undoStackRef.current.pop()
    if (!prev) return
    setUndoVersion((v) => v + 1)
    setSaving(true)
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/book`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages: prev.pages }),
      })
      if (!res.ok) {
        toast.error(`Undo failed (HTTP ${res.status})`)
        return
      }
      await reloadBook()
      toast.info('Undid last change')
    } catch (err) {
      toast.error(`Undo failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setSaving(false)
    }
  }, [brandSlug, reloadBook])

  // Keyboard shortcuts. Active everywhere except inside input/textarea/
  // select/contentEditable (so native editing isn't hijacked).
  useEffect(() => {
    const isTypingTarget = (el: HTMLElement | null) => {
      if (!el) return false
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable
      )
    }
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      // ⌘K — open command palette (also OK while typing — designed for it).
      if (mod && key === 'k') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
        return
      }
      // Esc closes cmdk if open
      if (e.key === 'Escape' && cmdkOpen) {
        setCmdkOpen(false)
        return
      }
      // Below shortcuts skip when user is typing in a field.
      if (isTypingTarget(e.target as HTMLElement)) return

      if (designerEnabled && mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        void undo()
        return
      }
      if (designerEnabled && mod && key === 'n') {
        e.preventDefault()
        fireCommand('new-page')
        return
      }
      // ⌘E toggles designer/client view.
      if (mod && key === 'e') {
        e.preventDefault()
        void navigate({
          to: '.',
          search: designerEnabled ? {} : { designer: '1' as const },
          replace: true,
        })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [designerEnabled, undo, navigate, cmdkOpen])

  // Sidebar active-state. Three cases:
  //   /b/<slug>                     → templates (currentFullPath = '__templates')
  //   /b/<slug>/guidelines          → no page selected, '' (handled by redirect)
  //   /b/<slug>/guidelines/<page>   → currentFullPath = <page> or <page>/<child>
  const currentFullPath = useMemo(() => {
    if (!location.pathname.includes('/guidelines')) return '__templates'
    const m = location.pathname.match(/\/guidelines(?:\/(.+))?$/)
    return m?.[1] ?? ''
  }, [location.pathname])

  const brandCtx = useMemo(
    () => ({ brand, brandSlug, designerEnabled, reloadBrand }),
    [brand, brandSlug, designerEnabled, reloadBrand],
  )

  const bookCtx: BrandBookContextValue | null = useMemo(() => {
    if (!book || !tokens) return null
    return {
      book,
      tokens,
      assets,
      brandSlug,
      designerEnabled,
      selection,
      setSelection,
      reloadBook,
      patchPage,
      patchTokens,
      reloadAssets,
      saving,
      lastSavedAt,
      canUndo,
      undo,
    }
  }, [
    book,
    tokens,
    assets,
    brandSlug,
    designerEnabled,
    selection,
    reloadBook,
    patchPage,
    patchTokens,
    reloadAssets,
    saving,
    lastSavedAt,
    canUndo,
    undo,
    // canUndo is derived from undoVersion — listing it ensures memo recomputes.
    undoVersion,
  ])

  if (error) {
    return <div className="fw-bbook__empty" style={{ margin: '2rem' }}>{error}</div>
  }
  if (!bookCtx) {
    return <div className="fw-bbook__empty" style={{ margin: '2rem' }}>Loading…</div>
  }

  const inspectorVisible = designerEnabled && !!bookCtx.selection.blockId

  return (
    <BrandContext.Provider value={brandCtx}>
      <BrandBookContext.Provider value={bookCtx}>
        <div
          className={`fw-bbook ${designerEnabled ? 'is-designer' : ''} ${
            inspectorVisible ? 'is-editing' : ''
          }`}
          onClick={() => {
            if (designerEnabled && bookCtx.selection.blockId) {
              setSelection({ pageId: null, blockId: null })
            }
          }}
        >
          <aside className="fw-bbook__sidebar print:hidden">
            <PageSidebar
              pages={bookCtx.book.pages}
              currentFullPath={currentFullPath}
              brandSlug={brandSlug}
              designerEnabled={designerEnabled}
              brand={brand}
            />
          </aside>
          <main className="fw-bbook__main">
            <Outlet />
          </main>
          {inspectorVisible ? <BlockInspector /> : null}
          {cmdkOpen ? <CommandPalette onClose={() => setCmdkOpen(false)} /> : null}
        </div>
      </BrandBookContext.Provider>
    </BrandContext.Provider>
  )
}
