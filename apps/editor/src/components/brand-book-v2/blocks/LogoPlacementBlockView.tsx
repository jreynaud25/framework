import type { LogoPlacementBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

const POSITION_STYLES: Record<'tl' | 'tr' | 'bl' | 'br' | 'c', React.CSSProperties> = {
  tl: { top: 12, left: 12 },
  tr: { top: 12, right: 12 },
  bl: { bottom: 12, left: 12 },
  br: { bottom: 12, right: 12 },
  c: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
}

const POSITION_LABEL: Record<'tl' | 'tr' | 'bl' | 'br' | 'c', string> = {
  tl: 'top left',
  tr: 'top right',
  bl: 'bottom left',
  br: 'bottom right',
  c: 'center',
}

/**
 * Approved placement positions diagram — a 16:9 frame per position with
 * the logo dropped into the corresponding corner. The recommended position
 * (bottom-right, Vevo-style) is highlighted with a primary outline.
 */
export function LogoPlacementBlockView({ block }: { block: LogoPlacementBlock }) {
  const { tokens, assets } = useBrandBookContext()
  const positions = block.positions ?? ['tl', 'tr', 'bl', 'br', 'c']
  const logo = assets.find((a) => a.kind === 'logo')

  return (
    <div className="fw-bbook__placement">
      {positions.map((pos) => (
        <div key={pos} className={`fw-bbook__placement-frame ${pos === 'br' ? 'is-recommended' : ''}`}>
          <div className="fw-bbook__placement-canvas" style={{ background: tokens.colors.semantic?.bg ?? '#fafaf7' }}>
            {logo ? (
              <img
                src={logo.dataUrl}
                alt="logo"
                style={{
                  position: 'absolute',
                  ...POSITION_STYLES[pos],
                  maxHeight: 28,
                }}
              />
            ) : null}
          </div>
          <span className="fw-bbook__placement-label">{POSITION_LABEL[pos]}{pos === 'br' ? ' · recommended' : ''}</span>
        </div>
      ))}
    </div>
  )
}
