import type { EmbedBlock } from '@framework/types'

/**
 * Sandboxed embed for custom HTML (rare — escape hatch). The host has
 * `sandbox="allow-scripts"` only; no parent navigation, no clipboard, no
 * mic/camera. Designer is responsible for what's inside.
 */
export function EmbedBlockView({ block }: { block: EmbedBlock }) {
  return (
    <iframe
      className="fw-bbook__embed"
      sandbox="allow-scripts"
      srcDoc={block.html}
      style={{ width: '100%', height: block.height ?? 320, border: 0 }}
      title="embed"
    />
  )
}
