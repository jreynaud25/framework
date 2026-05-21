import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { BrandContext, type BrandRecord } from './brandContext'

interface Props {
  brandSlug: string
  designerEnabled: boolean
}

/**
 * Copy the *current* public URL (no ?designer flag) to the clipboard so
 * sharing always points to the page the designer is looking at. Returns
 * true on success; caller flashes a toast.
 */
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
 * Layout for /b/[brandSlug] and its sub-routes. Owns the shared header
 * (back-link, brand name, primary color swatch) and the tab bar that
 * switches between Templates and Brand identity. Templates render in a
 * max-w-6xl container; the brand-book guidelines route renders full-width
 * so it can show its own left sidebar.
 */
export function BrandLayout({ brandSlug, designerEnabled }: Props) {
  const [brand, setBrand] = useState<BrandRecord | null>(null)
  const [shareFlash, setShareFlash] = useState<string | null>(null)
  const location = useLocation()
  const isGuidelines = location.pathname.includes('/guidelines')

  async function handleShare() {
    const ok = await copyCurrentUrl()
    setShareFlash(ok ? 'Link copied' : 'Copy failed')
    window.setTimeout(() => setShareFlash(null), 1800)
  }

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}`)
      if (res.ok) setBrand((await res.json()) as BrandRecord)
    } catch {
      /* brand record optional — header falls back to slug */
    }
  }, [brandSlug])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <BrandContext.Provider value={{ brand, brandSlug, designerEnabled, reloadBrand: reload }}>
      <div className="mx-auto w-full max-w-6xl px-8 pt-8 pb-2 print:hidden">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {designerEnabled ? (
              <Link
                to="/d"
                className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] hover:text-[var(--fg)]"
              >
                ← Studio
              </Link>
            ) : (
              <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)]">Brand</div>
            )}
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-[28px] font-medium leading-tight">{brand?.name ?? brandSlug}</h1>
              {brand?.primaryColor ? (
                <span
                  className="inline-block rounded-full border border-[var(--line)]"
                  style={{ width: 16, height: 16, background: brand.primaryColor }}
                  title={brand.primaryColor}
                />
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              <span className="font-mono">/b/{brandSlug}</span>
              {brand?.industry ? ` · ${brand.industry}` : ''}
              {designerEnabled ? ' · designer view' : ' · your space'}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {shareFlash ? (
              <span className="text-[10px] text-[var(--muted)]">{shareFlash}</span>
            ) : null}
            <button
              type="button"
              className="fw-chip"
              onClick={() => void handleShare()}
              title="Copy the current public URL to share"
            >
              Share
            </button>
            {isGuidelines && !designerEnabled ? (
              <button
                type="button"
                className="fw-chip"
                onClick={() => window.print()}
                title="Print brand book"
              >
                Print
              </button>
            ) : null}
          </div>
        </header>

        <div className="flex items-center gap-1 border-b border-[var(--line)]">
          <Link
            to="/b/$brandSlug"
            params={{ brandSlug }}
            search={designerEnabled ? { designer: '1' as const } : undefined}
            className={`fw-tab-link ${!isGuidelines ? 'is-active' : ''}`}
          >
            Templates
          </Link>
          <Link
            to="/b/$brandSlug/guidelines"
            params={{ brandSlug }}
            search={designerEnabled ? { designer: '1' as const } : undefined}
            className={`fw-tab-link ${isGuidelines ? 'is-active' : ''}`}
          >
            Brand identity
          </Link>
        </div>
      </div>

      {/* Outlet renders raw; templates view wraps itself in max-w-6xl,
          the brand book renders full-width and self-organises with its
          own internal sidebar. */}
      <Outlet />
    </BrandContext.Provider>
  )
}
