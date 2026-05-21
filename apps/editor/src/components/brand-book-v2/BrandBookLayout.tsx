import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import type { BrandBook, BrandPage, BrandTokens } from '@framework/types'
import type { BrandAsset } from '../brand-book/types'
import { BrandContext, type BrandRecord } from '../brandContext'
import {
  BrandBookContext,
  type BrandBookContextValue,
  type BrandBookSelection,
} from './brandBookContext'
import { PageSidebar } from './PageSidebar'
import { BlockInspector } from './designer/BlockInspector'

interface Props {
  brandSlug: string
  designerEnabled: boolean
}

/**
 * The full brand shell. Mounts on /b/<slug> and owns:
 *   - brand record fetch + BrandContext (for templates view + sub-components)
 *   - book + tokens + assets fetch + BrandBookContext
 *   - left sidebar (brand header, page tree, Templates link, footer)
 *   - right Outlet — renders the current page or the Templates view
 *   - designer-mode inspector pane (when a block is selected)
 *
 * There is no separate header / max-w container above this layout; the
 * brand book IS the surface.
 */
export function BrandBookLayout({ brandSlug, designerEnabled }: Props) {
  const location = useLocation()
  const [brand, setBrand] = useState<BrandRecord | null>(null)
  const [book, setBook] = useState<BrandBook | null>(null)
  const [tokens, setTokens] = useState<BrandTokens | null>(null)
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<BrandBookSelection>({
    pageId: null,
    blockId: null,
  })

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
      setError(err instanceof Error ? err.message : String(err))
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
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug])

  const patchPage = useCallback(
    async (pageId: string, patch: Partial<BrandPage>) => {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandSlug)}/book/pages/${encodeURIComponent(pageId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        },
      )
      if (!res.ok) {
        console.error('[brand-book] page patch failed', res.status)
        return
      }
      const updated = (await res.json()) as BrandPage
      setBook((prev) =>
        prev
          ? { ...prev, pages: prev.pages.map((p) => (p.id === pageId ? updated : p)) }
          : prev,
      )
    },
    [brandSlug],
  )

  const patchTokens = useCallback(
    async (delta: Partial<BrandTokens>) => {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(delta),
      })
      if (!res.ok) {
        console.error('[brand-book] tokens patch failed', res.status)
        return
      }
      const data = (await res.json()) as { tokens: BrandTokens; versionNumber: number }
      setTokens(data.tokens)
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
        </div>
      </BrandBookContext.Provider>
    </BrandContext.Provider>
  )
}
