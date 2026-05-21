import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

interface Brand {
  id: string
  slug: string
  name: string
  industry?: 'fashion' | 'luxury' | 'hospitality' | 'other'
  primaryColor?: string
  clientEmail?: string
  inviteSentAt?: string
  createdAt: string
  updatedAt: string
}

type ViewMode = 'grid' | 'list'
type SortKey = 'recent' | 'oldest' | 'created-recent' | 'created-oldest' | 'name-asc' | 'name-desc'

const VIEW_LS = 'framework.dashboard.view'
const SORT_LS = 'framework.dashboard.sort'

/**
 * Studio-level home for the designer. Two views — grid of large thumbnails
 * (visual scan) or list table (dense info) — toggled top-right. Sort key
 * is shared between views and persisted to localStorage.
 */
export function DesignerDashboard() {
  const [brands, setBrands] = useState<Brand[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const [view, setView] = useState<ViewMode>(() => {
    const s = readLS(VIEW_LS)
    return s === 'list' ? 'list' : 'grid'
  })
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    const s = readLS(SORT_LS) as SortKey | null
    return s ?? 'recent'
  })

  useEffect(() => writeLS(VIEW_LS, view), [view])
  useEffect(() => writeLS(SORT_LS, sortBy), [sortBy])

  useEffect(() => {
    fetch('/api/brands')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { brands: Brand[] }) => setBrands(data.brands))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const sorted = useMemo(() => (brands ? sortBrands(brands, sortBy) : null), [brands, sortBy])

  function open(slug: string) {
    void navigate({
      to: '/b/$brandSlug',
      params: { brandSlug: slug },
      search: { designer: '1' as const },
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)]">Studio</div>
          <h1 className="mt-1 text-[24px] font-medium leading-tight">Brands</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {brands ? `${brands.length} workspace${brands.length === 1 ? '' : 's'}` : ' '}
          </p>
        </div>
        <Link to="/d/new" className="fw-chip" data-active="true">
          + New brand
        </Link>
      </header>

      <div className="mb-6 flex items-center gap-2">
        <select
          className="fw-select-mini"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="recent">Last modified ↓</option>
          <option value="oldest">Last modified ↑</option>
          <option value="created-recent">Newest first</option>
          <option value="created-oldest">Oldest first</option>
          <option value="name-asc">Name A → Z</option>
          <option value="name-desc">Name Z → A</option>
        </select>
        <div className="flex-1" />
        <div className="fw-view-toggle">
          <button
            type="button"
            data-active={view === 'grid'}
            onClick={() => setView('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            type="button"
            data-active={view === 'list'}
            onClick={() => setView('list')}
            title="List view"
            aria-label="List view"
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-[12px] text-[var(--danger)]">{error}</div>
      ) : !sorted ? (
        <div className="text-[12px] text-[var(--muted)]">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line-2)] p-12 text-center text-[var(--muted)]">
          No brands yet. Click <strong>+ New brand</strong> to create your first workspace.
        </div>
      ) : view === 'grid' ? (
        <GridView brands={sorted} onOpen={open} />
      ) : (
        <ListView brands={sorted} onOpen={open} />
      )}
    </div>
  )
}

/* ──────────────────── Grid view ──────────────────── */

function GridView({ brands, onOpen }: { brands: Brand[]; onOpen: (slug: string) => void }) {
  return (
    <div className="fw-brand-grid">
      {brands.map((b) => (
        <button
          key={b.slug}
          type="button"
          className="fw-brand-card"
          onClick={() => onOpen(b.slug)}
        >
          <div
            className="fw-brand-card__thumb"
            style={{ background: b.primaryColor ?? 'var(--bg-3)' }}
          >
            {b.industry ? (
              <span className="fw-brand-card__industry">{b.industry}</span>
            ) : null}
          </div>
          <div className="fw-brand-card__meta">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px]">{b.name}</span>
              {b.clientEmail && b.inviteSentAt ? (
                <span
                  className="fw-avatar shrink-0"
                  title={`Client invited: ${b.clientEmail}`}
                  style={{ background: 'var(--highlight)', color: '#000', width: 22, height: 22, fontSize: 10 }}
                >
                  {b.clientEmail.charAt(0).toUpperCase()}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--muted)]">
              Last modified {rel(b.updatedAt)}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ──────────────────── List view ──────────────────── */

function ListView({ brands, onOpen }: { brands: Brand[]; onOpen: (slug: string) => void }) {
  return (
    <table className="fw-brand-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Last modified</th>
          <th>Created</th>
          <th>Client</th>
        </tr>
      </thead>
      <tbody>
        {brands.map((b) => (
          <tr key={b.slug} onClick={() => onOpen(b.slug)} tabIndex={0}>
            <td>
              <div className="flex items-center gap-3">
                <div
                  className="fw-brand-thumb"
                  style={{ background: b.primaryColor ?? 'var(--bg-3)' }}
                />
                <div className="min-w-0">
                  <div className="text-[13px] truncate">{b.name}</div>
                  <div className="text-[10px] text-[var(--muted)] mt-0.5">
                    /b/{b.slug}
                    {b.industry ? ` · ${b.industry}` : ''}
                  </div>
                </div>
              </div>
            </td>
            <td className="text-[var(--fg-2)]">{rel(b.updatedAt)}</td>
            <td className="text-[var(--muted)]">{rel(b.createdAt)}</td>
            <td>
              {b.clientEmail ? (
                <div className="flex items-center gap-2">
                  <span
                    className="fw-avatar"
                    title={b.clientEmail}
                    style={{
                      background: b.inviteSentAt ? 'var(--highlight)' : 'var(--bg-3)',
                      color: b.inviteSentAt ? '#000' : 'var(--muted)',
                    }}
                  >
                    {b.clientEmail.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {b.inviteSentAt ? 'Invited' : 'Pending'}
                  </span>
                </div>
              ) : (
                <span className="text-[var(--muted)]">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ──────────────────── Helpers ──────────────────── */

function sortBrands(brands: Brand[], key: SortKey): Brand[] {
  const arr = [...brands]
  switch (key) {
    case 'recent':
      return arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    case 'oldest':
      return arr.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    case 'created-recent':
      return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'created-oldest':
      return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name))
  }
}

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeLS(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
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
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="0" y="0" width="6" height="6" rx="1" />
      <rect x="8" y="0" width="6" height="6" rx="1" />
      <rect x="0" y="8" width="6" height="6" rx="1" />
      <rect x="8" y="8" width="6" height="6" rx="1" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="0" y="1" width="14" height="2" rx="1" />
      <rect x="0" y="6" width="14" height="2" rx="1" />
      <rect x="0" y="11" width="14" height="2" rx="1" />
    </svg>
  )
}
