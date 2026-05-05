import { loadDesignerDashboard } from '@/server/designer/dashboard'
import { DashboardHeader } from './_components/DashboardHeader'
import { ReferralRevenueCard } from './_components/ReferralRevenueCard'
import { BrandActivityTable } from './_components/BrandActivityTable'
import { PipelineList } from './_components/PipelineList'

export const dynamic = 'force-dynamic'

export default async function DesignerDashboardPage() {
  const data = await loadDesignerDashboard()
  return (
    <main className="min-h-dvh px-8 py-10">
      <DashboardHeader designerName={data.designerName} />

      <section className="mt-10 grid gap-px bg-fw-line md:grid-cols-3">
        <ReferralRevenueCard
          totalCents={data.totals.lifetimeCents}
          monthCents={data.totals.thisMonthCents}
          pendingCents={data.totals.pendingCents}
          currency={data.totals.currency}
        />
        <Stat label="Active brands" value={String(data.totals.activeBrandCount)} hint={`${data.totals.activeUserCount} editors`} />
        <Stat
          label="Templates published"
          value={String(data.totals.templatesPublishedThisMonth)}
          hint={`${data.totals.exportsThisMonth} exports / mo`}
        />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl tracking-tight">Brand activity</h2>
        <p className="mt-1 text-sm text-fw-muted">Last 30 days, sorted by recency.</p>
        <div className="mt-6">
          <BrandActivityTable rows={data.brands} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl tracking-tight">Pipeline</h2>
        <p className="mt-1 text-sm text-fw-muted">
          Brands you invited that haven't activated. They earn 30% recurring once they subscribe.
        </p>
        <div className="mt-6">
          <PipelineList rows={data.pipeline} />
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-fw-bg p-6">
      <div className="text-xs uppercase tracking-widest text-fw-muted">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
      {hint ? <div className="mt-1 text-xs text-fw-muted">{hint}</div> : null}
    </div>
  )
}
