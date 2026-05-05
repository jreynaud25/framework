interface Props {
  totalCents: number
  monthCents: number
  pendingCents: number
  currency: string
}

export function ReferralRevenueCard({ totalCents, monthCents, pendingCents, currency }: Props) {
  return (
    <div className="bg-fw-bg p-6">
      <div className="text-xs uppercase tracking-widest text-fw-muted">Referral revenue</div>
      <div className="mt-2 font-display text-3xl">{formatCents(totalCents, currency)}</div>
      <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-fw-muted">
        <div>
          <div className="text-fw-fg">{formatCents(monthCents, currency)}</div>
          <div>this month</div>
        </div>
        <div>
          <div className="text-fw-fg">{formatCents(pendingCents, currency)}</div>
          <div>pending payout</div>
        </div>
      </div>
    </div>
  )
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
