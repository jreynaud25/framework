import { useEffect, useMemo, useRef, useState } from 'react'
import { TemplateRenderer, formatToDimensions, validateSlotValues } from '@framework/renderer'
import type { Format, SlotValues } from '@framework/types'
import { useCompositionStore } from '@/state/composition'
import type { CompositionPayload } from '@/data/loadComposition'
import { SlotEditors } from './SlotEditors'
import { FormatToggle } from './FormatToggle'

const API_BASE = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL
  ?? 'http://localhost:3000'

interface Props {
  data: CompositionPayload
}

export function CompositionEditor({ data }: Props) {
  const hydrate = useCompositionStore((s) => s.hydrate)
  const slotValues = useCompositionStore((s) => s.slotValues)
  const format = useCompositionStore((s) => s.format)

  useEffect(() => {
    hydrate({ format: data.format, slotValues: data.slotValues })
  }, [hydrate, data])

  const errors = useMemo(
    () => validateSlotValues(data.slotSchema, slotValues),
    [data.slotSchema, slotValues],
  )

  const imageResolver = useMemo(
    () => (key: string) => `${data.imageBaseUrl}/${key}`,
    [data.imageBaseUrl],
  )

  return (
    <div className="grid h-full grid-cols-[1fr_360px] overflow-hidden">
      <section className="grid place-items-center overflow-auto bg-[#0c0c0c] p-8">
        <PreviewStage format={format}>
          <TemplateRenderer
            layout={data.layout}
            tokens={data.tokens}
            slotValues={slotValues}
            format={format}
            imageResolver={imageResolver}
          />
        </PreviewStage>
      </section>
      <aside className="overflow-y-auto border-l border-[var(--line)] bg-[var(--bg)] p-5">
        <header className="mb-5">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)]">Template</div>
          <h2 className="mt-1 text-lg">{data.templateName}</h2>
        </header>

        <FormatToggle formats={data.formats as Format[]} />

        <hr className="my-5 border-[var(--line)]" />

        <SlotEditors
          schema={data.slotSchema}
          errors={errors}
          palette={data.tokens.colors.palette.map((p) => p.hex)}
        />

        <hr className="my-5 border-[var(--line)]" />

        <ExportControls
          brandSlug={data.brandSlug}
          templateSlug={data.templateSlug}
          format={format}
          slotValues={slotValues}
          disabled={errors.some((e) => e.reason === 'required')}
        />
      </aside>
    </div>
  )
}

function ExportControls({
  brandSlug,
  templateSlug,
  format,
  slotValues,
  disabled,
}: {
  brandSlug: string
  templateSlug: string
  format: Format
  slotValues: SlotValues
  disabled: boolean
}) {
  const [busy, setBusy] = useState<'png' | 'svg' | 'draft' | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function exportFile(mime: 'png' | 'svg') {
    setBusy(mime)
    setStatus(null)
    try {
      const res = await fetch(`${API_BASE}/api/exports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brandSlug,
          templateSlug,
          format,
          mime,
          scale: 2,
          slotValues,
        }),
      })
      if (!res.ok) {
        setStatus(`Export failed: ${res.status} ${await res.text()}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        res.headers
          .get('content-disposition')
          ?.match(/filename="(.+?)"/)
          ?.[1] ?? `export.${mime}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setStatus(`Exported ${mime.toUpperCase()} (${(blob.size / 1024).toFixed(0)} KB)`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          className="flex-1 rounded-full bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
          disabled={disabled || busy !== null}
          onClick={() => exportFile('png')}
        >
          {busy === 'png' ? 'Rendering…' : 'Export PNG'}
        </button>
        <button
          className="rounded-full border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-50"
          disabled={disabled || busy !== null}
          onClick={() => exportFile('svg')}
        >
          {busy === 'svg' ? '…' : 'SVG'}
        </button>
      </div>
      {status ? <div className="mt-2 text-xs text-[var(--muted)]">{status}</div> : null}
    </div>
  )
}

/**
 * Center + auto-fit the rendered template inside the available viewport.
 *
 * Computes a uniform scale so the full canvas fits — recalculates on
 * window resize. The format's intrinsic dimensions stay 1080-based; we
 * just shrink visually. This keeps the underlying SVG export pipeline
 * pixel-identical to what the brand client sees.
 */
function PreviewStage({
  children,
  format,
}: {
  children: React.ReactNode
  format: Format
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const dims = useMemo(() => formatToDimensions(format), [format])

  useEffect(() => {
    const el = wrapperRef.current?.parentElement
    if (!el) return
    const compute = () => {
      const padding = 64 // p-8 on the section
      const availW = Math.max(0, el.clientWidth - padding)
      const availH = Math.max(0, el.clientHeight - padding)
      const s = Math.min(availW / dims.width, availH / dims.height, 1)
      setScale(Number.isFinite(s) && s > 0 ? s : 1)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dims])

  return (
    <div
      ref={wrapperRef}
      style={{
        width: dims.width * scale,
        height: dims.height * scale,
      }}
    >
      <div
        style={{
          width: dims.width,
          height: dims.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          boxShadow: '0 12px 60px rgba(0, 0, 0, 0.45)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
