import type { PipelineRow } from '@/server/designer/dashboard'

interface Props {
  rows: PipelineRow[]
}

const STATUS_LABEL: Record<PipelineRow['status'], { label: string; tone: string }> = {
  invited: { label: 'Invite sent', tone: 'text-fw-muted' },
  signed_up: { label: 'Signed up', tone: 'text-amber-300' },
  no_subscription: { label: 'No subscription', tone: 'text-red-400' },
}

export function PipelineList({ rows }: Props) {
  if (rows.length === 0) {
    return <div className="text-fw-muted">No invites yet. Add one from your designer profile.</div>
  }
  return (
    <div className="grid gap-px bg-fw-line">
      {rows.map((row) => {
        const status = STATUS_LABEL[row.status]
        return (
          <div key={row.inviteEmail} className="flex items-center justify-between bg-fw-bg p-4">
            <div>
              <div className="text-sm">{row.brandName}</div>
              <div className="font-mono text-[11px] text-fw-muted">{row.inviteEmail}</div>
            </div>
            <div className="text-right">
              <div className={'text-xs uppercase tracking-widest ' + status.tone}>{status.label}</div>
              <div className="font-mono text-[11px] text-fw-muted">{row.invitedAt}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
