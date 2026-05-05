import { NextResponse, type NextRequest } from 'next/server'

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? 'frame-work.app'

/**
 * Subdomain routing per BRIEF §3 / §10.4: tenant lives at
 *   {slug}.frame-work.app
 *
 * The middleware reads the subdomain, sets a `x-tenant-slug` header for
 * downstream handlers, and rewrites the marketing root paths into the
 * `(tenant)` route group when on a tenant host.
 */
export function middleware(req: NextRequest): NextResponse {
  const host = req.headers.get('host') ?? ''
  const url = req.nextUrl.clone()

  const tenantSlug = parseTenantSlug(host)
  const isMarketing = !tenantSlug || tenantSlug === 'www'

  const res = NextResponse.next()
  res.headers.set('x-host', host)

  if (isMarketing) {
    res.headers.set('x-surface', 'marketing')
    return res
  }

  res.headers.set('x-surface', 'tenant')
  res.headers.set('x-tenant-slug', tenantSlug!)

  // Rewrite '/'  →  '/(tenant)/'  so the tenant route group serves the path.
  // Next.js route groups don't appear in the URL, so we just attach the slug
  // header and let the (tenant) layout pick it up.
  return res
}

function parseTenantSlug(host: string): string | null {
  // Strip port.
  const hostname = host.split(':')[0]
  if (!hostname) return null

  // Allow localhost.tenant.localhost in dev: e.g. 3070.localhost:3000
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.replace(/\.localhost$/, '')
    return slug || null
  }

  if (!hostname.endsWith(APP_HOST)) return null
  const sub = hostname.slice(0, -APP_HOST.length).replace(/\.$/, '')
  if (!sub) return null
  return sub
}

export const config = {
  matcher: ['/((?!_next/|api/og|api/health|favicon|.*\\..*).*)'],
}
