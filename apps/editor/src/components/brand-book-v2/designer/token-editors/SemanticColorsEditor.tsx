import type { HexColor } from '@framework/types'
import { useBrandBookContext } from '../../brandBookContext'

/**
 * Editor for `tokens.colors.semantic` — the bg/fg/accent/etc. that drive
 * the brand book's theming and many block backgrounds. Each row is a
 * named slot with a color picker.
 */
const SLOTS = ['bg', 'fg', 'accent', 'muted', 'danger'] as const

export function SemanticColorsEditor() {
  const { tokens, patchTokens } = useBrandBookContext()
  const semantic = tokens.colors.semantic ?? {}

  const update = (slot: string, hex: HexColor | undefined) => {
    void patchTokens({
      colors: {
        primary: tokens.colors.primary,
        palette: tokens.colors.palette,
        semantic: { ...semantic, [slot]: hex },
      },
    })
  }

  return (
    <div className="fw-bbook-edit__tokens">
      <div className="fw-bbook-edit__tokens-head">
        <span>Semantic colors</span>
        <span className="fw-bbook-edit__tokens-tag">shared</span>
      </div>
      <div className="fw-bbook-edit__tokens-list">
        {SLOTS.map((slot) => {
          const value = semantic[slot] ?? ''
          return (
            <div key={slot} className="fw-bbook-edit__tokens-row">
              <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => update(slot, e.target.value as HexColor)}
                className="fw-bbook-edit__tokens-color"
              />
              <span className="fw-bbook-edit__tokens-slot-label">{slot}</span>
              <input
                type="text"
                className="fw-bbook-edit__field-input"
                value={value}
                onChange={(e) => update(slot, (e.target.value || undefined) as HexColor)}
                placeholder="—"
                style={{ width: 100 }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
