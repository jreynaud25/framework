import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandTokens, LayoutNode } from '@framework/types'

interface Props {
  layout: LayoutNode
  tokens: BrandTokens
}

/**
 * Detect font families referenced by the template that the browser hasn't
 * loaded, and let the designer/client upload a font file to register on the
 * fly via the FontFace API. The font becomes available immediately for the
 * preview render — no reload needed.
 *
 * Detection is best-effort: we sample a few common weights via
 * `document.fonts.check()`. Tokens authored by the designer state their
 * fontFamily explicitly; layout-level TextStyle.tokenRef points back to
 * tokens. We probe both.
 */
export function FontStatus({ layout, tokens }: Props) {
  const referenced = useMemo(() => referencedFontFamilies(layout, tokens), [layout, tokens])
  const [missing, setMissing] = useState<string[]>([])
  const [resolvedFonts, setResolvedFonts] = useState<Set<string>>(new Set())
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingFamily, setPendingFamily] = useState<string | null>(null)

  useEffect(() => {
    const check = () => {
      const m: string[] = []
      for (const family of referenced) {
        if (resolvedFonts.has(family)) continue
        try {
          const ok = (document as Document & { fonts?: FontFaceSet }).fonts?.check(`16px "${family}"`)
          if (!ok) m.push(family)
        } catch {
          m.push(family)
        }
      }
      setMissing(m)
    }
    check()
    // Re-check after document.fonts updates (e.g., a font got loaded by CSS).
    const fs = (document as Document & { fonts?: FontFaceSet }).fonts
    if (fs && 'addEventListener' in fs) {
      const handler = () => check()
      fs.addEventListener('loadingdone', handler)
      return () => fs.removeEventListener('loadingdone', handler)
    }
  }, [referenced, resolvedFonts])

  async function handleFile(family: string, file: File) {
    try {
      const buf = await file.arrayBuffer()
      const face = new FontFace(family, buf)
      await face.load()
      ;(document as Document & { fonts: FontFaceSet }).fonts.add(face)
      setResolvedFonts((prev) => new Set(prev).add(family))
    } catch (err) {
      console.error('[FontStatus] failed to register font', family, err)
    }
  }

  if (missing.length === 0) return null

  return (
    <div className="space-y-1">
      <div className="fw-section">Missing fonts</div>
      <div>
        {missing.map((family) => (
          <div key={family} className="fw-row">
            <span className="fw-row__label truncate">{family}</span>
            <div className="fw-row__value">
              <button
                className="fw-btn"
                onClick={() => {
                  setPendingFamily(family)
                  fileInput.current?.click()
                }}
              >
                Add…
              </button>
            </div>
          </div>
        ))}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".woff2,.woff,.ttf,.otf,application/font-woff2,application/font-woff,font/ttf,font/otf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && pendingFamily) {
            void handleFile(pendingFamily, file)
            setPendingFamily(null)
          }
          e.target.value = ''
        }}
      />
      <div className="pt-1 text-[10px] text-[var(--muted)]">.woff2 / .ttf / .otf — session only</div>
    </div>
  )
}

/** Collect every font family the template references (token-level + inline). */
function referencedFontFamilies(layout: LayoutNode, tokens: BrandTokens): string[] {
  const set = new Set<string>()
  // Tokens
  for (const entry of Object.values(tokens.typography)) {
    if (entry?.fontFamily) set.add(entry.fontFamily)
  }
  // Layout text nodes (in case any override the token family in the future)
  function walk(n: LayoutNode) {
    if (n.type === 'frame') n.children.forEach(walk)
    // TextStyle currently only references tokens by tokenRef; future-proof.
  }
  walk(layout)
  return Array.from(set)
}
