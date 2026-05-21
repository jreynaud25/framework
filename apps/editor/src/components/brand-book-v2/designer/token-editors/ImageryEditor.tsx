import { useBrandBookContext } from '../../brandBookContext'
import { StringListField } from '../fields'

/**
 * Editor for `tokens.imagery` — the brand's Do / Don't direction for
 * photography and visual treatments. Surfaces when a doDontGrid block
 * is selected.
 */
export function ImageryEditor() {
  const { tokens, patchTokens } = useBrandBookContext()
  const imagery = tokens.imagery ?? { dos: [], donts: [] }

  return (
    <div className="fw-bbook-edit__tokens">
      <div className="fw-bbook-edit__tokens-head">
        <span>tokens.imagery</span>
        <span className="fw-bbook-edit__tokens-tag">shared</span>
      </div>
      <div className="fw-bbook-edit__tokens-list">
        <StringListField
          label="Do (✓)"
          value={imagery.dos}
          onChange={(next) => void patchTokens({ imagery: { ...imagery, dos: next } })}
        />
        <StringListField
          label="Don't (✕)"
          value={imagery.donts}
          onChange={(next) => void patchTokens({ imagery: { ...imagery, donts: next } })}
        />
      </div>
    </div>
  )
}
