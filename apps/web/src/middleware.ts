import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

const APP_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? 'localhost'
const HAS_CLERK = Boolean(process.env.CLERK_SECRET_KEY)

const isProtectedRoute = createRouteMatcher([
  '/account(.*)',
  '/admin(.*)',
  '/designer(.*)',
  '/templates/(.*)/edit(.*)',
])

const isWebhook = createRouteMatcher(['/api/clerk/webhook', '/api/stripe/webhook'])

/**
 * Two responsibilities, one middleware:
 *   1. Tenant routing: parse `{slug}.{APP_HOST}`, attach x-tenant-slug to
 *      the request that the route handlers see.
 *   2. Auth: gate /account, /admin, /designer behind Clerk — only when
 *      CLERK_SECRET_KEY is configured. Without keys we run a pure
 *      tenant-routing middleware so the app boots locally with zero env.
 *
 * Tenant headers go to the *server-side request* via NextResponse.next({
 * request: { headers } }), NOT to the response — otherwise the request's
 * content-type leaks into the response and clobbers API content types.
 */
function nextWithTenant(req: NextRequest): NextResponse {
  const requestHeaders = new Headers(req.headers)
  const host = req.headers.get('host') ?? ''
  const slug = parseTenantSlug(host)
  requestHeaders.set('x-host', host)
  if (slug && slug !== 'www') {
    requestHeaders.set('x-surface', 'tenant')
    requestHeaders.set('x-tenant-slug', slug)
  } else {
    requestHeaders.set('x-surface', 'marketing')
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

const tenantOnly = (req: NextRequest): NextResponse => nextWithTenant(req)

const withClerk = clerkMiddleware(async (auth, req: NextRequest) => {
  const res = nextWithTenant(req)
  if (!isWebhook(req) && isProtectedRoute(req)) {
    const a = await auth()
    if (!a.userId) return NextResponse.redirect(new URL('/sign-in', req.url))
  }
  return res
})

export default HAS_CLERK ? withClerk : tenantOnly

function parseTenantSlug(host: string): string | null {
  const hostname = host.split(':')[0]
  if (!hostname) return null
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.replace(/\.localhost$/, '')
    return slug || null
  }
  if (!hostname.endsWith(APP_HOST)) return null
  const sub = hostname.slice(0, -APP_HOST.length).replace(/\.$/, '')
  return sub || null
}

export const config = {
  matcher: ['/((?!_next/|.*\\..*).*)', '/(api|trpc)(.*)'],
}
