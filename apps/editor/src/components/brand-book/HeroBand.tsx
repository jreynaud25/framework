import { contrastTextFor } from './contrast'

interface Props {
  title: string
  subtitle: string
  accentColor: string
  headingFont: string
}

/**
 * Full-bleed hero band painted with the brand's primary color. Brand name
 * sits at the largest typography scale; subtitle is a small caption. Text
 * color auto-adapts to the accent's luminance.
 */
export function HeroBand({ title, subtitle, accentColor, headingFont }: Props) {
  const textColor = contrastTextFor(accentColor)
  return (
    <div
      className="fw-bb__band"
      style={{
        background: accentColor,
        color: textColor,
      }}
    >
      <h1 style={{ fontFamily: headingFont }}>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}
