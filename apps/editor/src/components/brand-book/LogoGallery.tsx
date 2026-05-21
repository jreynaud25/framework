import type { LogoToken } from '@framework/types'
import { contrastTextFor } from './contrast'

interface Props {
  logos: ReadonlyArray<LogoToken>
  pageBg: string
  pageFg: string
}

/**
 * Logos shown on both backgrounds the page uses (bg + fg), so the client
 * sees how each variant reads against light and dark surfaces. We assume
 * the page bg is "light surface" and the fg is "dark surface" — true for
 * the default theme; if the brand inverts both, the two panels become
 * subtle variations rather than a hard contrast.
 */
export function LogoGallery({ logos, pageBg, pageFg }: Props) {
  return (
    <div className="space-y-6">
      <Row label="On page background" bg={pageBg} fg={pageFg} logos={logos} />
      <Row label="On inverted background" bg={pageFg} fg={pageBg} logos={logos} />
    </div>
  )
}

function Row({
  label,
  bg,
  fg,
  logos,
}: {
  label: string
  bg: string
  fg: string
  logos: ReadonlyArray<LogoToken>
}) {
  const captionColor = contrastTextFor(bg)
  return (
    <div>
      <div
        className="text-[10px] tracking-[0.1em] uppercase mb-2"
        style={{ opacity: 0.55 }}
      >
        {label}
      </div>
      <div className="fw-bb__logo-grid">
        {logos.map((logo, i) => (
          <div
            key={`${logo.variant}-${i}`}
            className="fw-bb__logo-card"
            style={{ background: bg, color: fg, borderColor: 'rgba(127,127,127,0.15)' }}
          >
            {logo.r2Key ? (
              <img src={String(logo.r2Key)} alt={logo.name} />
            ) : (
              <span style={{ opacity: 0.4, fontSize: 11 }}>(missing)</span>
            )}
            <div
              className="fw-bb__logo-meta"
              style={{ color: captionColor, opacity: 0.55 }}
            >
              {logo.variant}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
