import type { BrandTokens, TypographyEntry, TypographyTokens } from '@framework/types'

interface Props {
  tokens: BrandTokens
  onPatch: (patch: Partial<BrandTokens>) => Promise<void>
  readOnly?: boolean
}

/**
 * Per-role typography editor. Each role (display, heading, body, …) edits
 * fontFamily, defaultWeight, scale (px sizes, comma-separated), and
 * lineHeight. Includes a live preview line at the role's largest scale.
 */
export function TypographySection({ tokens, onPatch, readOnly }: Props) {
  const typography = tokens.typography
  const roles = Object.entries(typography).filter(
    (e): e is [string, TypographyEntry] => e[1] !== undefined,
  )

  async function updateRole(
    roleKey: string,
    change: Partial<TypographyEntry>,
  ): Promise<void> {
    const existing = typography[roleKey]
    if (!existing) return
    const next = { ...typography, [roleKey]: { ...existing, ...change } } as TypographyTokens
    await onPatch({ typography: next })
  }

  async function addRole(): Promise<void> {
    const name = prompt('Role name (lowercase, e.g. "caption", "mono")')
    if (!name) return
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (!slug || typography[slug]) return
    const next = {
      ...typography,
      [slug]: {
        fontFamily: 'Inter',
        fontTokenKey: slug,
        weights: [400],
        defaultWeight: 400,
        scale: [16],
        lineHeight: 1.4,
      },
    } as TypographyTokens
    await onPatch({ typography: next })
  }

  async function removeRole(key: string): Promise<void> {
    if (key === 'body') {
      alert('The "body" role is required and cannot be removed.')
      return
    }
    if (!confirm(`Remove typography role "${key}"?`)) return
    const next = Object.fromEntries(
      Object.entries(typography).filter(([k]) => k !== key),
    ) as TypographyTokens
    await onPatch({ typography: next })
  }

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-medium">Typography</h2>
        {!readOnly && (
          <button type="button" className="fw-btn" onClick={() => void addRole()}>
            + Add role
          </button>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="text-[11px] text-[var(--muted)]">
          No typography roles. Add one above.
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map(([key, entry]) => (
            <div
              key={key}
              className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] p-5 space-y-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-medium">{key}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => void removeRole(key)}
                    className="fw-btn fw-btn--ghost"
                    title={`Remove role ${key}`}
                  >
                    Remove
                  </button>
                )}
              </div>

              <RowField label="Font family">
                <input
                  className="fw-input fw-input--text"
                  defaultValue={entry.fontFamily}
                  disabled={readOnly}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== entry.fontFamily) void updateRole(key, { fontFamily: v })
                  }}
                />
              </RowField>

              <RowField label="Default weight">
                <input
                  type="number"
                  className="fw-input"
                  value={entry.defaultWeight}
                  disabled={readOnly}
                  step={100}
                  min={100}
                  max={900}
                  onChange={(e) =>
                    void updateRole(key, { defaultWeight: parseInt(e.target.value, 10) || 400 })
                  }
                />
              </RowField>

              <RowField label="Scale (px)">
                <input
                  className="fw-input"
                  defaultValue={entry.scale.join(', ')}
                  disabled={readOnly}
                  onBlur={(e) => {
                    const scale = e.target.value
                      .split(',')
                      .map((s) => parseInt(s.trim(), 10))
                      .filter((n) => Number.isFinite(n) && n > 0)
                    if (scale.length) void updateRole(key, { scale })
                  }}
                />
              </RowField>

              <RowField label="Line height">
                <input
                  type="number"
                  className="fw-input"
                  value={entry.lineHeight}
                  disabled={readOnly}
                  step={0.05}
                  min={0.5}
                  max={3}
                  onChange={(e) =>
                    void updateRole(key, { lineHeight: parseFloat(e.target.value) || 1.4 })
                  }
                />
              </RowField>

              {/* Live preview at the largest scale */}
              <div
                className="mt-3 rounded bg-[var(--bg)] p-4 border border-[var(--line)]"
                style={{
                  fontFamily: entry.fontFamily,
                  fontWeight: entry.defaultWeight,
                  fontSize: Math.min(entry.scale[0] ?? 16, 48),
                  lineHeight: entry.lineHeight,
                }}
              >
                The quick brown fox
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function RowField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ width: 130, fontSize: 11, color: 'var(--muted)' }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
