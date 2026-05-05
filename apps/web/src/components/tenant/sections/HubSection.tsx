import * as React from 'react'

interface Props {
  id: string
  kicker: string
  title: string
  description?: string
  children: React.ReactNode
}

/** Vevo-style accordion section: hairline on top, kicker, title, content. */
export function HubSection({ id, kicker, title, description, children }: Props) {
  return (
    <section id={id} className="fw-hairline px-8 py-12 md:py-16">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-3">
          <div className="text-xs uppercase tracking-widest text-fw-muted">{kicker}</div>
          <h2 className="mt-3 font-display text-3xl tracking-tight">{title}</h2>
          {description ? <p className="mt-3 text-sm text-fw-muted">{description}</p> : null}
        </div>
        <div className="md:col-span-9">{children}</div>
      </div>
    </section>
  )
}
