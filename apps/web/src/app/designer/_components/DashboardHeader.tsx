interface Props {
  designerName: string
}

export function DashboardHeader({ designerName }: Props) {
  return (
    <header>
      <div className="text-xs uppercase tracking-widest text-fw-muted">Designer dashboard</div>
      <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
        Hi, {designerName}.
      </h1>
      <p className="mt-2 max-w-xl text-fw-muted">
        Your brands, their activity, your share. Everything you need to keep the partner program
        moving.
      </p>
    </header>
  )
}
