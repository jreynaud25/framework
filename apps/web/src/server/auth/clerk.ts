import 'server-only'
import { auth } from '@clerk/nextjs/server'

export interface AuthContext {
  userId: string | null
  orgId: string | null
  orgRole: 'admin' | 'member' | null
  /** Clerk org slug (we store the same value on `organizations.slug`). */
  orgSlug: string | null
}

export async function getAuthContext(): Promise<AuthContext> {
  const a = await auth()
  return {
    userId: a.userId,
    orgId: a.orgId ?? null,
    orgRole: (a.orgRole as 'admin' | 'member' | null) ?? null,
    orgSlug: a.orgSlug ?? null,
  }
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx.userId) throw new Response('Unauthorized', { status: 401 })
  return ctx
}

export async function requireOrgAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!ctx.orgId) throw new Response('No active org', { status: 403 })
  if (ctx.orgRole !== 'admin') throw new Response('Forbidden', { status: 403 })
  return ctx
}
