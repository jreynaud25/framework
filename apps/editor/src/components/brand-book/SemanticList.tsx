import type { HexColor } from '@framework/types'

interface Props {
  semantic: {
    bg?: HexColor
    fg?: HexColor
    accent?: HexColor
    muted?: HexColor
    danger?: HexColor
    [k: string]: HexColor | undefined
  }
}

const LABELS: Record<string, string> = {
  bg: 'Background',
  fg: 'Foreground',
  accent: 'Accent',
  muted: 'Muted',
  danger: 'Danger',
}

export function SemanticList({ semantic }: Props) {
  const entries = Object.entries(semantic).filter(
    (e): e is [string, HexColor] => typeof e[1] === 'string',
  )
  if (entries.length === 0) return null
  return (
    <div className="fw-bb__semantic">
      {entries.map(([key, hex]) => (
        <Row key={key} label={LABELS[key] ?? key} hex={hex} />
      ))}
    </div>
  )
}

function Row({ label, hex }: { label: string; hex: string }) {
  return (
    <>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span className="fw-bb__semantic-swatch" style={{ background: hex }} />
      <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
        {hex.toUpperCase()}
      </span>
    </>
  )
}
