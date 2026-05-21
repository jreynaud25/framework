import { useState } from 'react'
import type { BrandRecord } from '../../brandContext'

interface Props {
  brand: BrandRecord
  onClose: () => void
  onSaved: () => void
}

const INDUSTRIES: { value: BrandRecord['industry']; label: string }[] = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
]

/**
 * Edit the brand record itself (name, industry, primary color, client
 * email) — distinct from editing the brand book or tokens. PATCHes
 * /api/brands/<slug>; on success, calls onSaved so the layout reloads
 * the brand record and the sidebar header reflects the new values.
 */
export function BrandSettingsModal({ brand, onClose, onSaved }: Props) {
  const [name, setName] = useState(brand.name)
  const [industry, setIndustry] = useState<BrandRecord['industry']>(brand.industry)
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor ?? '#0a0a0a')
  const [clientEmail, setClientEmail] = useState(brand.clientEmail ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/brands/${encodeURIComponent(brand.slug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          industry,
          primaryColor,
          clientEmail: clientEmail || null,
        }),
      })
      if (!res.ok) {
        setErr(`Save failed (HTTP ${res.status})`)
        return
      }
      onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fw-bbook-edit__modal-backdrop" onClick={onClose}>
      <div className="fw-bbook-edit__modal" onClick={(e) => e.stopPropagation()}>
        <header className="fw-bbook-edit__modal-head">
          <h2>Brand settings</h2>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <form className="fw-bbook-edit__inspector-body" onSubmit={handleSubmit}>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Name</span>
            <input
              autoFocus
              className="fw-bbook-edit__field-input"
              value={name}
              required
              minLength={2}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Slug (read-only)</span>
            <input
              className="fw-bbook-edit__field-input"
              value={brand.slug}
              readOnly
              style={{ opacity: 0.6 }}
            />
          </label>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Industry</span>
            <select
              className="fw-bbook-edit__field-select"
              value={industry ?? ''}
              onChange={(e) => setIndustry((e.target.value || undefined) as BrandRecord['industry'])}
            >
              <option value="">—</option>
              {INDUSTRIES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <div className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Primary color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: 32, height: 32, border: 0, padding: 0, background: 'transparent' }}
              />
              <input
                type="text"
                className="fw-bbook-edit__field-input"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <label className="fw-bbook-edit__field">
            <span className="fw-bbook-edit__field-label">Client email (optional)</span>
            <input
              type="email"
              className="fw-bbook-edit__field-input"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@brand.com"
            />
          </label>

          {err ? (
            <p style={{ color: 'var(--bbook-danger)', fontSize: 12, margin: 0 }}>{err}</p>
          ) : null}

          <hr className="fw-bbook-edit__field-sep" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--bbook-line-2)',
                color: 'var(--bbook-fg)',
                padding: '7px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              style={{
                background: 'var(--bbook-fg)',
                border: 0,
                color: 'var(--bbook-bg)',
                padding: '7px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 13,
              }}
            >
              {busy ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
