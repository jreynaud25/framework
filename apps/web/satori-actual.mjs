// Reproduces what /api/og does, but standalone
import satori from 'satori'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const r = createRequire(import.meta.url)
const pkg = r.resolve('@fontsource/inter/package.json')
async function font(w) {
  const f = path.join(path.dirname(pkg), 'files', `inter-latin-${w}-normal.woff`)
  const b = await readFile(f)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
}

const fonts = [
  { name: 'Inter', data: await font(400), weight: 400, style: 'normal' },
  { name: 'Inter', data: await font(600), weight: 600, style: 'normal' },
  { name: 'Inter', data: await font(800), weight: 800, style: 'normal' },
]

// Hand-build the same tree the route would emit for spring-drop
const tree = {
  type: 'div',
  props: {
    style: { width: 1080, height: 1080, display: 'flex', flexDirection: 'column',
             background: '#0A0A0A', position: 'relative', fontFamily: 'Inter' },
    children: {
      type: 'div',
      props: {
        style: { display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start',
                 justifyContent: 'space-between', paddingTop: 80, paddingRight: 80,
                 paddingBottom: 80, paddingLeft: 80, width: '100%', height: '100%' },
        children: [
          { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: 14, fontWeight: 500,
                                            lineHeight: 1.2, letterSpacing: 0, color: '#FF0033',
                                            textTransform: 'uppercase', display: 'flex' },
                                  children: 'COLLECTION' } },
          { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: 120, fontWeight: 800,
                                            lineHeight: 1.0, letterSpacing: -0.03, color: '#FAFAF7',
                                            display: 'flex' },
                                  children: 'SPRING DROP 2026' } },
          { type: 'div', props: { style: { fontFamily: 'Inter', fontSize: 22, fontWeight: 400,
                                            lineHeight: 1.4, letterSpacing: 0, color: '#FAFAF7',
                                            display: 'flex' },
                                  children: 'April 12 — 21' } },
        ],
      },
    },
  },
}

try {
  const svg = await satori(tree, { width: 1080, height: 1080, fonts })
  console.log('OK', svg.length)
} catch (e) {
  console.error('FAIL', e)
}
