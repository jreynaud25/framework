/**
 * Lightweight command bus for cross-component actions in the brand book.
 * The CommandPalette and keyboard shortcuts dispatch commands; consumers
 * (PageSidebar, BrandBookLayout) subscribe. Using DOM CustomEvents keeps
 * the API zero-context-dependency — no global state needed.
 */

export type FwCommand = 'new-page' | 'edit-brand' | 'open-cmdk'

export function fireCommand(cmd: FwCommand): void {
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent(`fw:${cmd}`))
}

export function onCommand(cmd: FwCommand, handler: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  const name = `fw:${cmd}`
  document.addEventListener(name, handler)
  return () => document.removeEventListener(name, handler)
}
