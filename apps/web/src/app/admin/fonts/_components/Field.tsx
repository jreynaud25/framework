import * as React from 'react'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-widest text-fw-muted">{label}</div>
      <div className="mt-1.5">{children}</div>
      {hint ? <div className="mt-1 text-xs text-fw-muted">{hint}</div> : null}
    </label>
  )
}
