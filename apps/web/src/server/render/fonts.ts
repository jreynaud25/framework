import 'server-only'
import type { SatoriFont } from './satoriRender'

const FONT_CACHE = new Map<string, ArrayBuffer>()

/**
 * Resolve fonts for a Satori render call.
 *
 * For Phase 1 we ship Inter from the Google Fonts CDN. As BRIEF §3.3 lays
 * out, brand-specific fonts (Adobe Fonts, self-hosted licensed fonts) get
 * subsetted at render time to the exact glyphs in the composition. That
 * subsetting is a Phase 1.5 task; for the MVP we serve the full Inter file
 * and rely on Satori's text-on-image fallback when glyphs are missing.
 */
export async function loadDefaultFonts(): Promise<SatoriFont[]> {
  const inter400 = await loadInter(400)
  const inter600 = await loadInter(600)
  const inter800 = await loadInter(800)
  return [
    { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
    { name: 'Inter', data: inter600, weight: 600, style: 'normal' },
    { name: 'Inter', data: inter800, weight: 800, style: 'normal' },
  ]
}

const INTER_URLS: Record<number, string> = {
  400: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.otf',
  600: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.otf',
  800: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-ExtraBold.otf',
}

async function loadInter(weight: number): Promise<ArrayBuffer> {
  const url = INTER_URLS[weight]!
  const cached = FONT_CACHE.get(url)
  if (cached) return cached
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`Failed to load Inter ${weight}: ${res.status}`)
  const buf = await res.arrayBuffer()
  FONT_CACHE.set(url, buf)
  return buf
}
