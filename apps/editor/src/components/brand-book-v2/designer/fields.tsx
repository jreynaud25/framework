import { useRef, useState } from 'react'
import type { HexColor } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { toast } from '../../toast'

/**
 * Shared input components for the BlockInspector. Each component is
 * controlled — value + onChange. Layout / spacing handled by the parent.
 */

export function TextField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) {
  return (
    <label className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <input
        type="text"
        className="fw-bbook-edit__field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function TextareaField({ label, value, onChange, rows = 4 }: {
  label: string
  value: string
  onChange: (next: string) => void
  rows?: number
}) {
  return (
    <label className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <textarea
        className="fw-bbook-edit__field-textarea"
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function NumberField({ label, value, onChange, min, max, step = 1 }: {
  label: string
  value: number | undefined
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <label className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <input
        type="number"
        className="fw-bbook-edit__field-input"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <label className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <select
        className="fw-bbook-edit__field-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ToggleField({ label, value, onChange }: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="fw-bbook-edit__field fw-bbook-edit__field--inline">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

export function ColorField({ label, value, onChange }: {
  label: string
  value: HexColor | undefined
  onChange: (next: HexColor) => void
}) {
  return (
    <label className="fw-bbook-edit__field fw-bbook-edit__field--inline">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value as HexColor)}
          style={{ width: 28, height: 28, border: 0, background: 'transparent' }}
        />
        <input
          type="text"
          className="fw-bbook-edit__field-input"
          value={value ?? ''}
          placeholder="#000000"
          onChange={(e) => onChange(e.target.value as HexColor)}
          style={{ width: 92 }}
        />
      </span>
    </label>
  )
}

/**
 * Picker that lets the designer choose a color either from the brand's
 * palette (preferred) or as an inline override. Returns null for "no
 * selection" — useful for blocks that fall back to the primary.
 */
export function PaletteColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | undefined
  onChange: (next: string | undefined) => void
}) {
  const { tokens } = useBrandBookContext()
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <div className="fw-bbook-edit__swatch-row">
        <button
          type="button"
          className={`fw-bbook-edit__swatch fw-bbook-edit__swatch--clear ${value === undefined ? 'is-active' : ''}`}
          title="No selection"
          onClick={() => onChange(undefined)}
        >
          ø
        </button>
        {tokens.colors.palette.map((p) => (
          <button
            key={p.name}
            type="button"
            title={`${p.name} ${p.hex}`}
            className={`fw-bbook-edit__swatch ${value === p.name ? 'is-active' : ''}`}
            style={{ background: p.hex }}
            onClick={() => onChange(p.name)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Asset picker — shows thumbnails of brand assets, filtered by kind. Has
 * an "Upload" tile that reads the file as a data URL and POSTs to the
 * brand's assets endpoint, then refetches the asset list.
 */
export function AssetPicker({
  label,
  value,
  onChange,
  kind,
}: {
  label: string
  value: string | undefined
  onChange: (next: string | undefined) => void
  kind?: 'logo' | 'photo' | 'pattern' | 'icon'
}) {
  const { assets, brandSlug, reloadAssets } = useBrandBookContext()
  const candidates = kind ? assets.filter((a) => a.kind === kind) : assets
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const items: Array<{ kind: 'logo' | 'photo' | 'pattern' | 'icon'; label: string; dataUrl: string }> = []
      for (const f of Array.from(files)) {
        if (f.size > 30 * 1024 * 1024) {
          toast.error(`"${f.name}" is over 30 MB — skipped`)
          continue
        }
        if (!/^image\//.test(f.type)) {
          toast.error(`"${f.name}" is not an image — skipped`)
          continue
        }
        // SVG stays as-is (no need to resize); raster goes through a
        // canvas resize so we don't push 20MB+ base64 payloads.
        const targetWidth = kind === 'photo' ? 2000 : 1200
        const dataUrl =
          f.type === 'image/svg+xml'
            ? await readAsDataUrl(f)
            : await resizeRasterImage(f, targetWidth)
        items.push({ kind: kind ?? 'photo', label: f.name, dataUrl })
      }
      if (items.length === 0) return
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/assets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assets: items.map((it) => ({ ...it, source: 'editor' })) }),
      })
      if (!res.ok) {
        toast.error(`Upload failed (HTTP ${res.status})`)
        return
      }
      const data = (await res.json()) as { assets: { id: string }[] }
      await reloadAssets()
      toast.success(`Uploaded ${items.length} ${items.length > 1 ? 'assets' : 'asset'}`)
      if (data.assets[0]?.id) onChange(data.assets[0].id)
    } catch (err) {
      toast.error(`Upload error: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <div className="fw-bbook-edit__asset-row">
        <button
          type="button"
          className={`fw-bbook-edit__asset-tile fw-bbook-edit__asset-tile--clear ${value === undefined ? 'is-active' : ''}`}
          onClick={() => onChange(undefined)}
        >
          none
        </button>
        <button
          type="button"
          className="fw-bbook-edit__asset-tile fw-bbook-edit__asset-tile--upload"
          onClick={() => fileRef.current?.click()}
          title={busy ? 'Uploading…' : 'Upload image'}
          disabled={busy}
        >
          {busy ? '…' : '+'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = '' // reset so re-selecting the same file works
          }}
        />
        {candidates.length === 0 ? (
          <span className="fw-bbook-edit__asset-empty">no {kind ?? 'asset'} assets — click + to upload</span>
        ) : (
          candidates.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.label}
              className={`fw-bbook-edit__asset-tile ${value === a.id ? 'is-active' : ''}`}
              onClick={() => onChange(a.id)}
            >
              <img src={a.dataUrl} alt={a.label} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Editor for an array of strings — used by tone chips, vocabulary,
 * misuse item labels. Adds a new empty row when "+ add" is clicked.
 */
export function StringListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const update = (i: number, v: string) => {
    const next = [...value]
    next[i] = v
    onChange(next)
  }
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, ''])
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">{label}</span>
      <div className="fw-bbook-edit__list">
        {value.map((v, i) => (
          <div key={i} className="fw-bbook-edit__list-row">
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={v}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button type="button" title="Remove" onClick={() => remove(i)}>×</button>
          </div>
        ))}
        <button type="button" className="fw-bbook-edit__list-add" onClick={add}>
          + add
        </button>
      </div>
    </div>
  )
}

/**
 * Read a file as a data URL — used for vector formats (SVG) and as a
 * fallback. For raster images, prefer resizeRasterImage which caps the
 * payload size.
 */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Decode a raster image, fit it into a max width (preserving aspect),
 * re-encode as JPEG at 0.9 quality. Caps payload at ~hundreds of KB so we
 * don't blow past Next.js's default body limit on multi-MB iPhone photos.
 */
async function resizeRasterImage(file: File, maxWidth: number): Promise<string> {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = sourceUrl
    })
    const scale = img.width > maxWidth ? maxWidth / img.width : 1
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas not supported')
    ctx.drawImage(img, 0, 0, w, h)
    // PNG for files that were originally PNG (preserve transparency);
    // JPEG for everything else (smaller).
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    return canvas.toDataURL(mime, 0.9)
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
