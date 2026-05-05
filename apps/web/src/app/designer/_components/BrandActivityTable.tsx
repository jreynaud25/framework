import type { BrandActivityRow } from '@/server/designer/dashboard'

interface Props {
  rows: BrandActivityRow[]
}

export function BrandActivityTable({ rows }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-fw-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-fw-line bg-[#0e0e0e] text-left">
            <Th>Brand</Th>
            <Th right>Templates</Th>
            <Th right>Exports / mo</Th>
            <Th right>MRR</Th>
            <Th right>Your share</Th>
            <Th right>Last login</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brandId} className="border-b border-fw-line last:border-0">
              <Td>
                <div className="font-medium">{row.brandName}</div>
                <div className="font-mono text-[11px] text-fw-muted">{row.brandSlug}.frame-work.app</div>
              </Td>
              <Td right>{row.templatesPublished}</Td>
              <Td right>{row.exportsThisMonth}</Td>
              <Td right>{cents(row.mrrCents)}</Td>
              <Td right>
                <span className="text-fw-fg">{cents(row.commissionCents)}</span>
                <span className="ml-1 text-fw-muted">/ mo</span>
              </Td>
              <Td right>{relative(row.lastLoginAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={
        'p-3 text-xs uppercase tracking-widest text-fw-muted ' +
        (right ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  )
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={'p-3 ' + (right ? 'text-right' : 'text-left')}>{children}</td>
}

function cents(c: number): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c / 100)
}

function relative(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}
