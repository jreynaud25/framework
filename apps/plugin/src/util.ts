export function rgbToHex(rgb: RGB, opacity = 1): string {
  const r = clamp(Math.round(rgb.r * 255))
  const g = clamp(Math.round(rgb.g * 255))
  const b = clamp(Math.round(rgb.b * 255))
  const base = '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
  if (opacity >= 1) return base
  const alpha = clamp(Math.round(opacity * 255))
  return base + alpha.toString(16).padStart(2, '0')
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n))
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
