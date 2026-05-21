import { useEffect, useState } from 'react'
import { toast, type ToastInput, type ToastKind } from './toast'

interface ToastRecord {
  id: number
  message: string
  kind: ToastKind
}

let nextId = 1

/**
 * Mount-once provider that registers the toast handler on mount and
 * renders the visual stack top-right. Toasts auto-dismiss after their
 * duration; users can click × to dismiss early. Errors stay longer
 * (6s) than successes (3.5s) so the user has time to read them.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  useEffect(() => {
    toast.setHandler((input: ToastInput) => {
      const id = nextId++
      const kind = input.kind ?? 'info'
      const record: ToastRecord = { id, message: input.message, kind }
      setToasts((prev) => [...prev, record])
      const ttl =
        input.durationMs ?? (kind === 'error' ? 6000 : kind === 'success' ? 3500 : 4000)
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, ttl)
    })
  }, [])

  return (
    <>
      {children}
      <div className="fw-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`fw-toast fw-toast--${t.kind}`} role="status">
            <span className="fw-toast__icon" aria-hidden>
              {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}
            </span>
            <span className="fw-toast__body">{t.message}</span>
            <button
              type="button"
              className="fw-toast__close"
              aria-label="Dismiss"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
