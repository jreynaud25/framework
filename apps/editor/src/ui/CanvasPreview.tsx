import { useMemo } from 'react'
import { TemplateRenderer, formatToDimensions } from '@framework/renderer'
import { useEditorStore } from '../state/editorStore'

const R2_PUBLIC_BASE = (import.meta as ImportMeta & { env: { VITE_R2_PUBLIC_BASE?: string } }).env
  .VITE_R2_PUBLIC_BASE ?? 'https://cdn.frame-work.app'

export function CanvasPreview() {
  const project = useEditorStore((s) => s.project)
  const format = useEditorStore((s) => s.format)
  const slotValues = useEditorStore((s) => s.slotValues)

  const scale = useFitScale(format)
  const dims = formatToDimensions(format)

  if (!project) return null

  return (
    <div className="relative grid place-items-center overflow-hidden bg-[#050505] p-12">
      <div
        className="origin-center shadow-2xl"
        style={{ transform: `scale(${scale})` }}
      >
        <TemplateRenderer
          layout={project.layout}
          tokens={project.tokens}
          slotValues={slotValues}
          format={format}
          imageResolver={(r2Key) => `${R2_PUBLIC_BASE}/${r2Key}`}
        />
      </div>
      <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-widest text-fw-muted">
        {dims.width} × {dims.height}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { Format } from '@framework/types'

function useFitScale(format: Format): number {
  const [scale, setScale] = useState(0.6)
  useEffect(() => {
    const compute = () => {
      const dims = formatToDimensions(format)
      const w = window.innerWidth - 360 - 64
      const h = window.innerHeight - 56 - 64
      const s = Math.min(w / dims.width, h / dims.height, 1)
      setScale(Math.max(0.1, s))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [format])
  return scale
}
