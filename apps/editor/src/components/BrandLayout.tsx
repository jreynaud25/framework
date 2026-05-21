import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { BrandContext, type BrandRecord } from './brandContext'

interface Props {
  brandSlug: string
  designerEnabled: boolean
}

/**
 * Layout for /b/[brandSlug] and its sub-routes. Owns the shared header
 * (back-link, brand name, primary color swatch) and the tab bar that
 * switches between Templates and Brand identity. The current brand record
 * is fetched here once and shared with children via context.
 */
export function BrandLayout({ brandSlug, designerEnabled }: Props) {
  const [brand, setBrand] = useState<BrandRecord | null>(null)
  const location = useLocation()
  const isGuidelines = location.pathname.endsWith('/guidelines')

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
      <div className="mx-auto w-full max-w-6xl px-8 py-12">
        <header className="mb-6">
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
        </header>

        <div className="mb-8 flex items-center gap-1 border-b border-[var(--line)]">
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

        <Outlet />
      </div>
    </BrandContext.Provider>
  )
}
