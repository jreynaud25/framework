import { useCallback, useEffect, useState } from 'react'

type AssetKind = 'logo' | 'photo' | 'pattern' | 'icon'

interface BrandAsset {
  id: string
  brandSlug: string
  kind: AssetKind
  variant?: string
  label: string
  dataUrl: string
  width?: number
  height?: number
  uploadedAt: string
}

interface Props {
  brandSlug: string
  readOnly?: boolean
}

const KIND_LABELS: Record<AssetKind, string> = {
  logo: 'Logos',
  photo: 'Photography',
  pattern: 'Patterns',
  icon: 'Icons',
}

const KIND_HINTS: Record<AssetKind, string> = {
  logo: 'Push from Figma with layer name "logo/<variant>" — primary, wordmark, symbol, monochrome, inverted.',
  photo: 'Push from Figma with layer name "photo/<label>" — used as brand photography in the client view.',
  pattern: 'Push from Figma with layer name "pattern/<label>" — tileable motifs.',
  icon: 'Push from Figma with layer name "icon/<label>" — pictogram set.',
}

const ORDER: AssetKind[] = ['logo', 'photo', 'pattern', 'icon']

/**
 * Displays all assets uploaded for the brand, grouped by kind. Designer can
 * delete an asset (server-side DELETE + side-effect on tokens.logos for the
 * logo case). Uploads happen only from the Figma plugin in V1 — this UI
 * surfaces what's already there.
 */
export function AssetsSection({ brandSlug, readOnly }: Props) {
  const [assets, setAssets] = useState<BrandAsset[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/brands/${encodeURIComponent(brandSlug)}/assets`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { assets: BrandAsset[] }) => {
        if (!cancelled) setAssets(d.assets)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug, refresh])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Remove this asset? This cannot be undone.')) return
      try {
        const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/assets/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok && res.status !== 204) {
          console.error('[assets] delete failed', res.status)
          return
        }
        setRefresh((n) => n + 1)
      } catch (err) {
        console.error('[assets] delete error', err)
      }
    },
    [brandSlug],
  )

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-[16px] font-medium">Assets</h2>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          Pushed from Figma via the plugin (layer naming: <code>logo/…</code>,{' '}
          <code>photo/…</code>, <code>pattern/…</code>, <code>icon/…</code>).
        </p>
      </div>

      {error ? <div className="text-[12px] text-[var(--danger)]">{error}</div> : null}
      {!assets ? <div className="text-[12px] text-[var(--muted)]">Loading…</div> : null}

      {assets
        ? ORDER.map((kind) => {
            const items = assets.filter((a) => a.kind === kind)
            return (
              <div key={kind} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">
                    {KIND_LABELS[kind]} {items.length > 0 ? `· ${items.length}` : ''}
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="text-[11px] text-[var(--muted)]">{KIND_HINTS[kind]}</div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                    {items.map((a) => (
                      <div
                        key={a.id}
                        className="group relative rounded-md border border-[var(--line)] overflow-hidden bg-[var(--bg-2)]"
                      >
                        <div
                          className="aspect-[4/3] grid place-items-center bg-[var(--bg-3)]"
                          style={{ overflow: 'hidden' }}
                        >
                          <img
                            src={a.dataUrl}
                            alt={a.label}
                            className="max-w-[80%] max-h-[80%] object-contain"
                          />
                        </div>
                        <div className="px-2.5 py-2 flex items-baseline justify-between gap-2">
                          <span className="truncate text-[11px]">
                            {a.variant ?? a.label}
                          </span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(a.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[12px] text-[var(--muted)] hover:text-[var(--danger)]"
                              title="Remove"
                              aria-label="Remove asset"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        : null}
    </section>
  )
}
