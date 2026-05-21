import 'server-only'

export interface BrandInviteEmail {
  to: string
  brandName: string
  brandSlug: string
  designerName: string
  firstTemplateName?: string
  appUrl: string
  sentAt: string
}

interface EmailLog {
  invites: BrandInviteEmail[]
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkEmailLog: EmailLog | undefined
}

function log(): EmailLog {
  if (!globalThis.__frameworkEmailLog) {
    globalThis.__frameworkEmailLog = { invites: [] }
  }
  return globalThis.__frameworkEmailLog!
}

/**
 * Dev stub. Logs the invite to console + keeps it in memory for inspection.
 * Production: swap for Resend (per BRIEF §4) with React Email templates.
 */
export function sendBrandInvite(invite: Omit<BrandInviteEmail, 'sentAt'>): BrandInviteEmail {
  const record: BrandInviteEmail = { ...invite, sentAt: new Date().toISOString() }
  log().invites.push(record)
  console.log(
    '[email/brand-invite] →',
    record.to,
    JSON.stringify(
      {
        brand: record.brandName,
        slug: record.brandSlug,
        template: record.firstTemplateName,
        url: record.appUrl,
      },
      null,
      2,
    ),
  )
  return record
}

export function recentInvites(): BrandInviteEmail[] {
  return log().invites
}
