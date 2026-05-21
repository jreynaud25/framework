import type { VoiceTokens } from '@framework/types'

interface Props {
  voice: VoiceTokens
}

/**
 * Render the brand's voice & tone in the client brand book:
 *   - Tone as a single row of chips
 *   - Preferred / Avoid in a two-column do/don't layout
 *   - Forbidden words below if non-empty (danger-styled)
 */
export function VoicePage({ voice }: Props) {
  return (
    <div className="space-y-10">
      {voice.tone.length > 0 ? (
        <div>
          <h3>Tone</h3>
          <div className="fw-bb__chip-row">
            {voice.tone.map((t) => (
              <span key={t} className="fw-bb__chip">{t}</span>
            ))}
          </div>
        </div>
      ) : null}

      {(voice.vocabulary.preferred.length > 0 || voice.vocabulary.avoid.length > 0) ? (
        <div className="fw-bb__dual">
          <div>
            <h3>Preferred</h3>
            <ul className="fw-bb__list">
              {voice.vocabulary.preferred.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Avoid</h3>
            <ul className="fw-bb__list">
              {voice.vocabulary.avoid.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {voice.forbidden.length > 0 ? (
        <div>
          <h3>Forbidden</h3>
          <div className="fw-bb__chip-row">
            {voice.forbidden.map((w) => (
              <span
                key={w}
                className="fw-bb__chip"
                style={{
                  background: 'rgba(255, 92, 92, 0.12)',
                  color: 'var(--danger)',
                  borderColor: 'rgba(255, 92, 92, 0.3)',
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
