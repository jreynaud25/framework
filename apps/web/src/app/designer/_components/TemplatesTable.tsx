import Link from 'next/link'
import type { TemplateRecord } from '@/server/designer/store'

interface Props {
  rows: TemplateRecord[]
}

export function TemplatesTable({ rows }: Props) {
  if (rows.length === 0) {
    return <div className="text-fw-muted">No templates published yet.</div>
  }

  return (
    <div className="overflow-hidden rounded-md border border-fw-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-fw-line bg-[#0e0e0e] text-left">
            <Th>Template</Th>
            <Th>Brand</Th>
            <Th right>Editable slots</Th>
            <Th right>Open comments</Th>
            <Th right>Published</Th>
            <Th right></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tpl) => {
            const open = tpl.comments.filter((c) => c.status === 'open').length
            return (
              <tr key={tpl.id} className="border-b border-fw-line last:border-0">
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tpl.name}</span>
                    {tpl.isNew ? (
                      <span className="rounded-full bg-fw-fg px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-fw-bg">
                        New
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-[11px] text-fw-muted">
                    {tpl.formats.join(' · ')}
                  </div>
                </Td>
                <Td>{tpl.brandName}</Td>
                <Td right>{tpl.slots.length}</Td>
                <Td right>
                  {open === 0 ? (
                    <span className="text-fw-muted">—</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                      {open} open
                    </span>
                  )}
                </Td>
                <Td right>{relative(tpl.publishedAt)}</Td>
                <Td right>
                  <Link
                    href={`/designer/templates/${tpl.brandSlug}/${tpl.slug}`}
                    className="text-fw-muted hover:text-fw-fg"
                  >
                    Manage →
                  </Link>
                </Td>
              </tr>
            )
          })}
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

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}
