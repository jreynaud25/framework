import { useEffect, useMemo, useRef, useState } from 'react'
import { TemplateRenderer } from '@framework/renderer'
import type { BrandTokens, Format, LayoutNode, SlotValues } from '@framework/types'

interface ThumbnailPayload {
  layout: LayoutNode
  tokens: BrandTokens
  slotValues: SlotValues
  format: Format
  imageBaseUrl: string
  canvas?: { width: number; height: number }
}

interface Props {
  brandSlug: string
  templateSlug: string
  /** Canvas dimensions known from the list endpoint — used to size the
   *  container BEFORE the full payload arrives so the layout doesn't jump. */
  fallbackCanvas?: { width: number; height: number }
  /** Optional override for slot values — used by composition history to
   *  preview a specific snapshot instead of the template defaults. */
  slotValuesOverride?: SlotValues
  /** Optional format override (composition history may have used a
   *  different format than the template default). */
  formatOverride?: Format
}

/**
 * A scaled-down `TemplateRenderer` rendered inside a card on the brand hub.
 *
 * Why use the real renderer instead of a PNG: the renderer is pure + fast (no
 * network in the render path), and the preview matches pixel-for-pixel what
 * the client sees in the editor. No /api/exports round-trip per card.
 *
 * Scaling: we render the template at its intrinsic canvas dimensions inside
 * an absolutely-positioned div, then apply CSS `transform: scale(N)` to fit
 * the card thumb container. ResizeObserver re-computes on container resize.
 */
export function TemplateThumbnail({
  brandSlug,
  templateSlug,
  fallbackCanvas,
  slotValuesOverride,
  formatOverride,
}: Props) {
  const [data, setData] = useState<ThumbnailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/templates/${encodeURIComponent(brandSlug)}/${encodeURIComponent(templateSlug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ThumbnailPayload) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug, templateSlug])

  // Resolve the canvas dimensions: prefer the fetched payload's canvas, then
  // the layout root's intrinsic width/height, then the fallback from the list.
  const canvas = useMemo(() => {
    if (data?.canvas) return data.canvas
    if (data?.layout.type === 'frame') {
      const w = data.layout.style?.width
      const h = data.layout.style?.height
      if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
        return { width: w, height: h }
      }
    }
    return fallbackCanvas ?? { width: 1080, height: 1080 }
  }, [data, fallbackCanvas])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const compute = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w && h) {
        // Card thumb has the same aspect-ratio as the canvas, so width and
        // height ratios are equivalent. Use the smaller for safety.
        const s = Math.min(w / canvas.width, h / canvas.height)
        setScale(Number.isFinite(s) && s > 0 ? s : 0)
      }
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [canvas.width, canvas.height])

  const imageResolver = useMemo(
    () => (key: string) => {
      if (/^(blob:|data:|https?:\/\/)/.test(key)) return key
      return `${data?.imageBaseUrl ?? 'https://cdn.frame-work.app'}/${key}`
    },
    [data?.imageBaseUrl],
  )

  return (
    <div
      ref={containerRef}
      className="fw-hub-card__thumb-inner"
      style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}
    >
      {error ? (
        <span className="absolute inset-0 grid place-items-center text-[10px] text-[var(--muted)]">
          ⚠ preview unavailable
        </span>
      ) : !data ? (
        <span className="absolute inset-0 grid place-items-center text-[10px] text-[var(--muted)]">…</span>
      ) : (
        <div
          aria-hidden
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            visibility: scale > 0 ? 'visible' : 'hidden',
          }}
        >
          <TemplateRenderer
            layout={data.layout}
            tokens={data.tokens}
            slotValues={slotValuesOverride ?? data.slotValues}
            format={formatOverride ?? data.format}
            imageResolver={imageResolver}
          />
        </div>
      )}
    </div>
  )
}
