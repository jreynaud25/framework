import type { TypographyEntry, TypographyTokens } from '@framework/types'
import { useBrandBookContext } from '../../brandBookContext'

interface Props {
  role: string
}

/**
 * Editor for one typography role (heading / body / display / etc.). Edits
 * propagate to all blocks that resolve from this role + every template
 * that consumes it.
 */
export function TypographyRoleEditor({ role }: Props) {
  const { tokens, patchTokens } = useBrandBookContext()
  const typo = tokens.typography as Record<string, TypographyEntry | undefined>
  const entry = typo[role]
  if (!entry) return null

  const updateEntry = (patch: Partial<TypographyEntry>) => {
    const nextRole: TypographyEntry = { ...entry, ...patch }
    // Always include `body` (required field on TypographyTokens) — either
    // the existing one or the role being edited if role === 'body'.
    const nextTypo: TypographyTokens = {
      ...tokens.typography,
      body: role === 'body' ? nextRole : tokens.typography.body,
      [role]: nextRole,
    } as TypographyTokens
    void patchTokens({ typography: nextTypo })
  }

  return (
    <div className="fw-bbook-edit__tokens">
      <div className="fw-bbook-edit__tokens-head">
        <span>{role} role</span>
        <span className="fw-bbook-edit__tokens-tag">shared</span>
      </div>
      <div className="fw-bbook-edit__tokens-list">
        <label className="fw-bbook-edit__field">
          <span className="fw-bbook-edit__field-label">Font family</span>
          <input
            type="text"
            className="fw-bbook-edit__field-input"
            value={entry.fontFamily}
            onChange={(e) => updateEntry({ fontFamily: e.target.value })}
            placeholder="Inter, sans-serif"
          />
        </label>
        <label className="fw-bbook-edit__field">
          <span className="fw-bbook-edit__field-label">Default weight</span>
          <input
            type="number"
            className="fw-bbook-edit__field-input"
            value={entry.defaultWeight}
            min={100}
            max={900}
            step={100}
            onChange={(e) => updateEntry({ defaultWeight: Number(e.target.value) })}
          />
        </label>
        <label className="fw-bbook-edit__field">
          <span className="fw-bbook-edit__field-label">Weights (comma-sep)</span>
          <input
            type="text"
            className="fw-bbook-edit__field-input"
            value={entry.weights.join(', ')}
            onChange={(e) =>
              updateEntry({
                weights: e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => !Number.isNaN(n) && n > 0),
              })
            }
            placeholder="400, 500, 700"
          />
        </label>
        <label className="fw-bbook-edit__field">
          <span className="fw-bbook-edit__field-label">Scale (px, comma-sep)</span>
          <input
            type="text"
            className="fw-bbook-edit__field-input"
            value={entry.scale.join(', ')}
            onChange={(e) =>
              updateEntry({
                scale: e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => !Number.isNaN(n) && n > 0),
              })
            }
            placeholder="48, 32, 24, 16"
          />
        </label>
        <label className="fw-bbook-edit__field">
          <span className="fw-bbook-edit__field-label">Line height</span>
          <input
            type="number"
            className="fw-bbook-edit__field-input"
            value={entry.lineHeight}
            min={0.5}
            max={3}
            step={0.05}
            onChange={(e) => updateEntry({ lineHeight: Number(e.target.value) })}
          />
        </label>
        <label className="fw-bbook-edit__field">
          <span className="fw-bbook-edit__field-label">Letter spacing</span>
          <input
            type="number"
            className="fw-bbook-edit__field-input"
            value={entry.letterSpacing ?? 0}
            step={0.001}
            onChange={(e) => updateEntry({ letterSpacing: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  )
}
