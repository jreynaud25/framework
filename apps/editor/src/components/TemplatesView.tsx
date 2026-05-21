import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Format } from '@framework/types'
import { TemplateThumbnail } from './TemplateThumbnail'
import { useBrandContext, type BrandRecord } from './brandContext'

type TemplateStatus = 'draft' | 'published' | 'archived'
type Industry = 'fashion' | 'luxury' | 'hospitality' | 'other'

interface BrandTemplate {
  templateSlug: string
  name: string
  formats: Format[]
  versionNumber: number
  pushedAt: string
  canvas?: { width: number; height: number }
  status?: TemplateStatus
}

/**
 * Templates grid for a brand. Reads brand context from <BrandLayout>.
 * Client mode: only published templates + optional "Show archived" toggle.
 * Designer mode: all statuses with badges + "Edit brand" inline form.
 */
export function TemplatesView() {
  const { brand, brandSlug, designerEnabled, reloadBrand } = useBrandContext()
  const [templates, setTemplates] = useState<BrandTemplate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState(false)
  const navigate = useNavigate()

  const statusFilter = designerEnabled
    ? 'all'
    : showArchived
      ? 'published,archived'
      : 'published'

  useEffect(() => {
    let cancelled = false
    fetch(`/api/templates?brand=${encodeURIComponent(brandSlug)}&status=${statusFilter}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { templates: BrandTemplate[] }) => {
        if (!cancelled) setTemplates(data.templates)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug, statusFilter])

  return (
    <>
      <div className="mb-6 flex items-center justify-end gap-2">
        {designerEnabled && brand ? (
          <button
            type="button"
            className="fw-chip"
            data-active={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Close' : 'Edit brand'}
          </button>
        ) : null}
        {!designerEnabled ? (
          <button
            type="button"
            className="fw-chip"
            data-active={showArchived}
            onClick={() => setShowArchived(!showArchived)}
            title="Toggle archived templates"
          >
            {showArchived ? '✓ Show archived' : 'Show archived'}
          </button>
        ) : null}
      </div>

      {editing && brand ? (
        <BrandEditForm
          brand={brand}
          onSaved={() => {
            void reloadBrand()
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}

      {error ? (
        <div className="text-[12px] text-[var(--danger)]">{error}</div>
      ) : !templates ? (
        <div className="text-[12px] text-[var(--muted)]">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line-2)] p-12 text-center text-[var(--muted)]">
          No templates pushed yet. Push your first one from Figma.
        </div>
      ) : (
        <div className="fw-hub-grid">
          {templates.map((t) => (
            <button
              key={t.templateSlug}
              type="button"
              className="fw-hub-card"
              style={t.status === 'archived' ? { opacity: 0.55 } : undefined}
              onClick={() =>
                navigate({
                  to: '/c/$compositionId',
                  params: { compositionId: t.templateSlug },
                  search: {
                    brand: brandSlug,
                    designer: designerEnabled ? '1' : undefined,
                  },
                })
              }
            >
              <div
                className="fw-hub-card__thumb"
                style={
                  t.canvas
                    ? { aspectRatio: `${t.canvas.width} / ${t.canvas.height}` }
                    : { aspectRatio: '1 / 1' }
                }
              >
                <TemplateThumbnail
                  brandSlug={brandSlug}
                  templateSlug={t.templateSlug}
                  fallbackCanvas={t.canvas}
                />
                {t.status && t.status !== 'published' ? (
                  <span
                    className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider"
                    style={{
                      background: t.status === 'draft' ? '#3a3a00' : '#3a0000',
                      color: t.status === 'draft' ? '#ffd966' : '#ff8a8a',
                    }}
                  >
                    {t.status}
                  </span>
                ) : null}
              </div>
              <div className="fw-hub-card__meta">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14px]">{t.name}</span>
                  <span
                    className="shrink-0 text-[10px] text-[var(--muted)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    v{t.versionNumber}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {t.formats.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] text-[var(--muted)]"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-[var(--muted)]">{rel(t.pushedAt)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function BrandEditForm({
  brand,
  onSaved,
  onCancel,
}: {
  brand: BrandRecord
  onSaved: (b: BrandRecord) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(brand.name)
  const [industry, setIndustry] = useState<Industry | undefined>(brand.industry)
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor ?? '#0a0a0a')
  const [clientEmail, setClientEmail] = useState(brand.clientEmail ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brand.slug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          industry,
          primaryColor,
          clientEmail: clientEmail.trim() || null,
        }),
      })
      if (!res.ok) {
        setError(`Failed (HTTP ${res.status})`)
        return
      }
      const updated = (await res.json()) as BrandRecord
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-10 rounded-lg border border-[var(--line)] bg-[var(--bg-2)] p-6 space-y-5">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Edit brand</div>

      <Field label="Brand name">
        <input
          className="fw-input fw-input--text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Industry">
        <div className="flex flex-wrap gap-1.5">
          {(['fashion', 'luxury', 'hospitality', 'other'] as Industry[]).map((i) => (
            <button
              key={i}
              type="button"
              className="fw-chip"
              data-active={industry === i}
              onClick={() => setIndustry(industry === i ? undefined : i)}
            >
              {i.charAt(0).toUpperCase() + i.slice(1)}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Primary color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="fw-swatch fw-swatch--lg"
            style={{ background: primaryColor, padding: 0 }}
          />
          <span
            className="text-[11px] text-[var(--muted)]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {primaryColor.toUpperCase()}
          </span>
        </div>
      </Field>

      <Field
        label="Client email"
        hint={
          brand.inviteSentAt
            ? `Invite sent on ${new Date(brand.inviteSentAt).toLocaleDateString()}`
            : 'Will be notified at next first-push if set'
        }
      >
        <input
          className="fw-input fw-input--text"
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="pierre@maison-lumiere.com"
          spellCheck={false}
        />
      </Field>

      {error ? <div className="text-[12px] text-[var(--danger)]">{error}</div> : null}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" className="fw-btn fw-btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !name.trim()}
          className="rounded-full bg-[var(--fg)] px-4 py-1.5 text-[12px] font-medium text-[var(--bg)] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={save}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)] mb-2">{label}</div>
      {children}
      {hint ? <div className="text-[10px] text-[var(--muted)] mt-1">{hint}</div> : null}
    </div>
  )
}

function rel(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.max(1, Math.round((now - then) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}
