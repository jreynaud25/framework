import { useEditorStore } from '../state/editorStore'
import type { Format } from '@framework/types'

export function TopBar() {
  const project = useEditorStore((s) => s.project)
  const format = useEditorStore((s) => s.format)
  const setFormat = useEditorStore((s) => s.setFormat)
  if (!project) return null
  return (
    <header className="fw-hairline flex items-center justify-between border-b border-fw-line px-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-fw-muted">
          {project.brandName}
        </div>
        <div className="text-base">{project.templateName}</div>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-fw-line p-1">
        {project.formats.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f as Format)}
            className={
              'rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
              (f === format
                ? 'bg-fw-fg text-fw-bg'
                : 'text-fw-muted hover:text-fw-fg')
            }
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-full border border-fw-line px-4 py-1.5 text-xs hover:bg-fw-line">
          Save draft
        </button>
        <button className="rounded-full bg-fw-fg px-4 py-1.5 text-xs font-medium text-fw-bg hover:opacity-90">
          Export
        </button>
      </div>
    </header>
  )
}
