import satori from 'satori'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const r = createRequire(import.meta.url)
const pkg = r.resolve('@fontsource/inter/package.json')
const fontPath = path.join(path.dirname(pkg), 'files', 'inter-latin-400-normal.woff')
console.log('font from', fontPath)
const buf = await readFile(fontPath)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

try {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { width: 200, height: 200, display: 'flex', background: '#000', color: '#fff', fontFamily: 'Inter' },
        children: 'Hello',
      },
    },
    { width: 200, height: 200, fonts: [{ name: 'Inter', data: ab, weight: 400, style: 'normal' }] },
  )
  console.log('OK', svg.length)
} catch (e) {
  console.error('FAIL', e)
}
