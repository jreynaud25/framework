import 'server-only'
import { renderToString } from 'react-dom/server'
import * as React from 'react'
import { FROM, getResend } from './client'

export interface SendEmailArgs {
  to: string | string[]
  subject: string
  /** A React Email component instance — rendered to HTML server-side. */
  react: React.ReactElement
  replyTo?: string
  tag?: string
}

/**
 * Single send entry point. Renders the React Email tree to HTML, plus a
 * plain-text alternate that's just stripped tags for deliverability.
 *
 * In development without RESEND_API_KEY we no-op and log instead — emails
 * shouldn't block local boot.
 */
export async function sendEmail(args: SendEmailArgs): Promise<{ id: string | null }> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[email] dry-run', { to: args.to, subject: args.subject })
    return { id: null }
  }
  const html = renderToString(args.react)
  const text = stripHtml(html)
  const { data, error } = await getResend().emails.send({
    from: FROM,
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    html,
    text,
    replyTo: args.replyTo,
    tags: args.tag ? [{ name: 'tag', value: args.tag }] : undefined,
  })
  if (error) throw new Error(`Resend send failed: ${error.message}`)
  return { id: data?.id ?? null }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
