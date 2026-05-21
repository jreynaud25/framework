import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import type { BrandBook, BrandPage, BrandTokens } from '@framework/types'
import type { BrandAsset } from '../brand-book/types'
import { useBrandContext } from '../brandContext'
import {
  BrandBookContext,
  type BrandBookContextValue,
  type BrandBookSelection,
} from './brandBookContext'
import { PageSidebar } from './PageSidebar'

/**
 * Layout for /b/<slug>/guidelines. Owns the book + tokens + assets fetch,
 * keeps them in context for every child page, renders the left page-tree
 * sidebar. Child routes render in <Outlet />.
 */
export function BrandBookLayout() {
  const { brandSlug, designerEnabled } = useBrandContext()
  const location = useLocation()

  const [book, setBook] = useState<BrandBook | null>(null)
  const [tokens, setTokens] = useState<BrandTokens | null>(null)
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<BrandBookSelection>({
    pageId: null,
    blockId: null,
  })

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
      .then(([b, t, a]: [BrandBook, { tokens: BrandTokens }, { assets: BrandAsset[] }]) => {
        if (cancelled) return
        setBook(b)
        setTokens(t.tokens)
        setAssets(a.assets)
      })
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

  // Pull the page-slug portion out of the URL to drive sidebar active-state.
  // location.pathname looks like /b/<slug>/guidelines or .../guidelines/<page>
  // or .../guidelines/<page>/<child>. Empty string when on index.
  const currentFullPath = useMemo(() => {
    const m = location.pathname.match(/\/guidelines(?:\/(.+))?$/)
    return m?.[1] ?? ''
  }, [location.pathname])

  const ctxValue: BrandBookContextValue | null = useMemo(() => {
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
    }
  }, [book, tokens, assets, brandSlug, designerEnabled, selection, reloadBook, patchPage])

  if (error) {
    return <div className="text-[12px] text-[var(--danger)]">{error}</div>
  }
  if (!ctxValue) {
    return <div className="text-[12px] text-[var(--muted)]">Loading…</div>
  }

  return (
    <BrandBookContext.Provider value={ctxValue}>
      <div className="fw-bbook">
        <aside className="fw-bbook__sidebar print:hidden">
          <PageSidebar
            pages={ctxValue.book.pages}
            currentFullPath={currentFullPath}
            brandSlug={brandSlug}
            designerEnabled={designerEnabled}
          />
        </aside>
        <main className="fw-bbook__main">
          <Outlet />
        </main>
      </div>
    </BrandBookContext.Provider>
  )
}
