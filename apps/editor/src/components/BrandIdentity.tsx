import { useCallback, useEffect, useState } from 'react'
import type { BrandTokens } from '@framework/types'
import { useBrandContext } from './brandContext'
import { ColorsSection } from './sections/ColorsSection'
import { TypographySection } from './sections/TypographySection'

interface TokensPayload {
  tokens: BrandTokens
  versionNumber: number
}

/**
 * Brand identity (a.k.a. guidelines) — colors, typography, etc. Fetches
 * tokens from /api/brands/[slug]/tokens, owns local state for optimistic
 * updates, PATCHes on each edit. Read-only in client view.
 */
export function BrandIdentity() {
  const { brandSlug, designerEnabled, reloadBrand } = useBrandContext()
  const [tokens, setTokens] = useState<BrandTokens | null>(null)
  const [versionNumber, setVersionNumber] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: TokensPayload) => {
        if (!cancelled) {
          setTokens(data.tokens)
          setVersionNumber(data.versionNumber)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug])

  const patch = useCallback(
    async (delta: Partial<BrandTokens>) => {
      setSaving(true)
      try {
        const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(delta),
        })
        if (!res.ok) {
          console.error('[guidelines] patch failed', res.status, await res.text())
          return
        }
        const data = (await res.json()) as TokensPayload
        setTokens(data.tokens)
        setVersionNumber(data.versionNumber)
        // If primary changed, the BrandRecord.primaryColor also updated
        // server-side — refresh the layout header swatch.
        if (delta.colors && 'primary' in (delta.colors as object)) {
          void reloadBrand()
        }
      } catch (err) {
        console.error('[guidelines] network error', err)
      } finally {
        setSaving(false)
      }
    },
    [brandSlug, reloadBrand],
  )

  if (error) {
    return <div className="text-[12px] text-[var(--danger)]">{error}</div>
  }
  if (!tokens) {
    return <div className="text-[12px] text-[var(--muted)]">Loading…</div>
  }

  return (
    <div className="space-y-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-medium">Brand identity</h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {designerEnabled
              ? 'Edits propagate to every template using these tokens.'
              : 'Read-only view of this brand’s identity.'}
          </p>
        </div>
        <div className="text-[10px] text-[var(--muted)]">
          v{versionNumber}
          {saving ? ' · saving…' : ''}
        </div>
      </div>

      <ColorsSection tokens={tokens} onPatch={patch} readOnly={!designerEnabled} />
      <TypographySection tokens={tokens} onPatch={patch} readOnly={!designerEnabled} />
    </div>
  )
}
