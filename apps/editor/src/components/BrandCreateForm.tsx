import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type Industry = 'fashion' | 'luxury' | 'hospitality' | 'other'

export function BrandCreateForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugDirty, setSlugDirty] = useState(false)
  const [industry, setIndustry] = useState<Industry | undefined>(undefined)
  const [primaryColor, setPrimaryColor] = useState('#0a0a0a')
  const [clientEmail, setClientEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNameChange(v: string) {
    setName(v)
    if (!slugDirty) setSlug(slugify(v))
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          industry,
          primaryColor,
          clientEmail: clientEmail.trim() || undefined,
        }),
      })
      if (!res.ok) {
        if (res.status === 409) setError('That slug is already taken. Try another.')
        else if (res.status === 422) setError('Slug must be lowercase letters, numbers, or hyphens (2+ chars).')
        else setError(`Failed (HTTP ${res.status})`)
        return
      }
      const brand = (await res.json()) as { slug: string }
      void navigate({
        to: '/b/$brandSlug',
        params: { brandSlug: brand.slug },
        search: { designer: '1' as const },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = name.trim().length >= 2 && /^[a-z0-9-]{2,}$/.test(slug.trim()) && !busy

  return (
    <div className="mx-auto w-full max-w-xl px-8 py-12">
      <header className="mb-10">
        <Link
          to="/d"
          className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] hover:text-[var(--fg)]"
        >
          ← Studio
        </Link>
        <h1 className="mt-1 text-[24px] font-medium leading-tight">New brand</h1>
      </header>

      <div className="space-y-6">
        <Field label="Brand name">
          <input
            className="fw-input fw-input--text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Maison Lumière"
            autoFocus
          />
        </Field>

        <Field label="Slug" hint={`Will be the URL: /b/${slug || '…'}`}>
          <input
            className="fw-input fw-input--text"
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value))
              setSlugDirty(true)
            }}
            placeholder="maison-lumiere"
            spellCheck={false}
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

        <Field label="Primary color" hint="Placeholder until you push brand tokens from Figma">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="fw-swatch fw-swatch--lg"
              style={{ background: primaryColor, padding: 0 }}
            />
            <span className="text-[11px] text-[var(--muted)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {primaryColor.toUpperCase()}
            </span>
          </div>
        </Field>

        <Field
          label="Client email (optional)"
          hint="Notified once you push the first design. Leave empty to share the link yourself."
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
          <Link to="/d" className="fw-btn fw-btn--ghost">
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            className="rounded-full bg-[var(--fg)] px-5 py-2 text-[12px] font-medium text-[var(--bg)] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={submit}
          >
            {busy ? 'Creating…' : 'Create brand'}
          </button>
        </div>
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
