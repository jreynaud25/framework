import type { ImageryTokens } from '@framework/types'

interface Props {
  imagery: ImageryTokens
}

/**
 * Imagery direction in the client brand book: Do / Don't side by side.
 * The actual brand photography (from `photo/<name>` plugin pushes) lives
 * in PhotoGrid above — this section captures the *rules*, not the assets.
 */
export function ImageryPage({ imagery }: Props) {
  if (imagery.dos.length === 0 && imagery.donts.length === 0) return null
  return (
    <div className="fw-bb__dual">
      <div>
        <h3>Do</h3>
        <ul className="fw-bb__list">
          {imagery.dos.map((d, i) => (
            <li key={i}>
              <span style={{ opacity: 0.6, marginRight: 8 }}>✓</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>Don't</h3>
        <ul className="fw-bb__list">
          {imagery.donts.map((d, i) => (
            <li key={i}>
              <span style={{ opacity: 0.6, marginRight: 8, color: 'var(--danger)' }}>✕</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
