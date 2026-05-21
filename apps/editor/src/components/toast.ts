/**
 * Tiny event-bus toast system. Calls go through `toast.success(msg)`
 * etc. from anywhere — components, hooks, fetch error handlers. The
 * ToastProvider mounts at app root, registers its handler, and renders
 * the visual stack. Replacing 14+ silent console.errors across the
 * codebase with `toast.error(msg)` is the main payoff.
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastInput {
  message: string
  kind?: ToastKind
  /** Auto-dismiss timeout in ms. Default 3500 for success/info, 6000 for error. */
  durationMs?: number
}

type Handler = (input: ToastInput) => void

let handler: Handler = (input) => {
  // Pre-mount default: log so dev still sees something.
  // After mount the ToastProvider replaces this.
  const fn = input.kind === 'error' ? console.error : console.log
  fn(`[toast:${input.kind ?? 'info'}] ${input.message}`)
}

export const toast = {
  setHandler(fn: Handler): void {
    handler = fn
  },
  success(message: string, durationMs?: number): void {
    handler({ message, kind: 'success', durationMs })
  },
  error(message: string, durationMs?: number): void {
    handler({ message, kind: 'error', durationMs })
  },
  info(message: string, durationMs?: number): void {
    handler({ message, kind: 'info', durationMs })
  },
}
