import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Format, SlotValues } from '@framework/types'
import { TemplateThumbnail } from './TemplateThumbnail'

interface SavedComposition {
  id: string
  brandSlug: string
  templateSlug: string
  format: Format
  slotValues: SlotValues
  name: string
  createdAt: string
  updatedAt: string
}

interface Props {
  brandSlug: string
  templateSlug: string
  currentCompositionId: string | null
  /** Trigger to refresh when an export creates / updates a composition. */
  refreshKey: number
  fallbackCanvas?: { width: number; height: number }
  designerEnabled: boolean
}

/**
 * The client's saved-exports history for the current template. Each entry is
 * a snapshot of the slotValues at the moment of an Export PNG. Click → load
 * that snapshot into the editor for further iteration.
 */
export function CompositionHistory({
  brandSlug,
  templateSlug,
  currentCompositionId,
  refreshKey,
  fallbackCanvas,
  designerEnabled,
}: Props) {
  const [items, setItems] = useState<SavedComposition[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    let cancelled = false
    setError(null)
    fetch(`/api/compositions?brand=${encodeURIComponent(brandSlug)}&template=${encodeURIComponent(templateSlug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { compositions: SavedComposition[] }) => {
        if (!cancelled) setItems(data.compositions)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug, templateSlug])

  useEffect(() => {
    const cancel = load()
    return cancel
  }, [load, refreshKey])

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/compositions/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
      // Optimistic remove
      setItems((curr) => (curr ? curr.filter((c) => c.id !== id) : curr))
      if (currentCompositionId === id) {
        // We were editing the entry we just deleted — drop the comp param.
        void navigate({
          to: '/c/$compositionId',
          params: { compositionId: templateSlug },
          search: (prev) => ({ ...prev, comp: undefined }),
        })
      }
    } catch (err) {
      console.error('[history] delete failed', err)
    }
  }

  function openItem(id: string) {
    void navigate({
      to: '/c/$compositionId',
      params: { compositionId: templateSlug },
      search: (prev) => ({ ...prev, comp: id }),
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="fw-section">History</span>
        {items ? <span className="text-[10px] text-[var(--muted)]">{items.length}</span> : null}
      </div>

      {error ? (
        <div className="text-[10px] text-[var(--danger)]">{error}</div>
      ) : !items ? (
        <div className="text-[11px] text-[var(--muted)]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-[11px] text-[var(--muted)]">
          {designerEnabled
            ? 'No saved snapshots yet. The client builds history by exporting.'
            : 'Your saved exports will appear here.'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const isActive = c.id === currentCompositionId
            return (
              <div
                key={c.id}
                className={
                  'group relative flex gap-3 items-start rounded-md p-2 cursor-pointer transition-colors ' +
                  (isActive ? 'bg-[var(--bg-3)]' : 'hover:bg-[var(--bg-3)]')
                }
                onClick={() => openItem(c.id)}
              >
                <div
                  className="shrink-0 rounded overflow-hidden bg-[var(--bg-3)] border border-[var(--line)]"
                  style={{
                    width: 56,
                    height: 56,
                    aspectRatio: fallbackCanvas
                      ? `${fallbackCanvas.width} / ${fallbackCanvas.height}`
                      : '1 / 1',
                  }}
                >
                  <TemplateThumbnail
                    brandSlug={brandSlug}
                    templateSlug={templateSlug}
                    fallbackCanvas={fallbackCanvas}
                    slotValuesOverride={c.slotValues}
                    formatOverride={c.format}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] truncate">{c.name}</div>
                  <div className="text-[10px] text-[var(--muted)] mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {c.format} · {relativeTime(c.updatedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDelete(c.id)
                  }}
                  className="fw-row__delete shrink-0 opacity-0 group-hover:opacity-100"
                  title="Delete snapshot"
                  aria-label="Delete snapshot"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.max(1, Math.round((now - then) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}
