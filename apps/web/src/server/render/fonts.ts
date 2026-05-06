import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { SatoriFont } from './satoriRender'

const FONT_CACHE = new Map<number, ArrayBuffer>()

/**
 * Resolve fonts for a Satori render call.
 *
 * Reads Inter (Regular / SemiBold / ExtraBold) WOFF files committed to
 * `apps/web/public/fonts/`. Public assets ship with the deploy, so this
 * works the same in `next dev`, `next start`, and on Cloudflare Workers
 * (the OpenNext adapter bundles `public/` as worker assets).
 *
 * Brand-specific fonts (Adobe, self-hosted licensed) get subsetted at
 * render time per BRIEF §3.3 — Phase 1.5 work.
 *
 * Failures degrade gracefully: log + return empty array, Satori still
 * renders (text falls back to system).
 */
export async function loadDefaultFonts(): Promise<SatoriFont[]> {
  try {
    const [r400, r600, r800] = await Promise.all([
      loadInter(400),
      loadInter(600),
      loadInter(800),
    ])
    return [
      { name: 'Inter', data: r400, weight: 400, style: 'normal' },
      { name: 'Inter', data: r600, weight: 600, style: 'normal' },
      { name: 'Inter', data: r800, weight: 800, style: 'normal' },
    ]
  } catch (err) {
    console.warn('[fonts] failed to load Inter, rendering without text', err)
    return []
  }
}

async function loadInter(weight: 400 | 600 | 800): Promise<ArrayBuffer> {
  const cached = FONT_CACHE.get(weight)
  if (cached) return cached
  const filePath = path.join(
    process.cwd(),
    'public',
    'fonts',
    `inter-latin-${weight}-normal.woff`,
  )
  const buf = await readFile(filePath)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  FONT_CACHE.set(weight, ab)
  return ab
}
