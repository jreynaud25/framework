/**
 * Pick foreground text color (black or white) given a background color, so
 * captions stay legible on whatever brand swatch we render. Uses YIQ
 * brightness — fast, perceptual enough for solid colors.
 */
export function contrastTextFor(hex: string): '#000000' | '#ffffff' {
  const rgb = parseHex(hex)
  if (!rgb) return '#000000'
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  return yiq >= 128 ? '#000000' : '#ffffff'
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length !== 6 && h.length !== 8) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b }
}
