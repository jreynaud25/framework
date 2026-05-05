import { NextResponse, type NextRequest } from 'next/server'
import { Webhook } from 'svix'

/**
 * POST /api/clerk/webhook
 *
 * Syncs Clerk events into our `users` / `organizations` / `memberships`
 * tables. BRIEF §8 Wed: organizations + custom claims + magic-link signup.
 *
 * Verified via Svix headers + CLERK_WEBHOOK_SIGNING_SECRET.
 *
 * Database writes are stubbed until Supabase is provisioned; the handler
 * structurally accepts each event and logs the row that *would* be written.
 */

interface ClerkUserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    email_addresses: { email_address: string; id: string }[]
    primary_email_address_id?: string
    first_name?: string | null
    last_name?: string | null
    image_url?: string
  }
}

interface ClerkOrgEvent {
  type: 'organization.created' | 'organization.updated' | 'organization.deleted'
  data: {
    id: string
    name: string
    slug: string
    created_by: string
    public_metadata?: Record<string, unknown>
  }
}

interface ClerkMembershipEvent {
  type: 'organizationMembership.created' | 'organizationMembership.updated' | 'organizationMembership.deleted'
  data: {
    id: string
    organization: { id: string }
    public_user_data: { user_id: string }
    role: 'admin' | 'basic_member' | 'org:admin' | 'org:member' | string
  }
}

type ClerkEvent = ClerkUserEvent | ClerkOrgEvent | ClerkMembershipEvent

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CLERK_WEBHOOK_SIGNING_SECRET not configured' }, { status: 500 })
  }

  const svixId = req.headers.get('svix-id')
  const svixSig = req.headers.get('svix-signature')
  const svixTs = req.headers.get('svix-timestamp')
  if (!svixId || !svixSig || !svixTs) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(secret)
  let evt: ClerkEvent
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-signature': svixSig,
      'svix-timestamp': svixTs,
    }) as ClerkEvent
  } catch (err) {
    return NextResponse.json(
      { error: `Bad signature: ${err instanceof Error ? err.message : err}` },
      { status: 400 },
    )
  }

  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const u = evt.data
      const primary = u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0]
      const row = {
        clerkId: u.id,
        email: primary?.email_address ?? '',
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
        avatarUrl: u.image_url ?? null,
      }
      // TODO(week 1 Wed): UPSERT users WHERE clerk_id = u.id
      console.log('[clerk] user upsert', row)
      break
    }
    case 'user.deleted': {
      // TODO: soft-delete or cascade per RLS
      console.log('[clerk] user deleted', evt.data.id)
      break
    }
    case 'organization.created':
    case 'organization.updated': {
      const o = evt.data
      const row = {
        clerkOrgId: o.id,
        slug: o.slug,
        name: o.name,
        type: (o.public_metadata?.['type'] as 'brand' | 'studio' | undefined) ?? 'brand',
        ownerClerkId: o.created_by,
        metadata: o.public_metadata ?? {},
      }
      // TODO: UPSERT organizations WHERE clerk_org_id = o.id (resolve owner_user_id from users)
      console.log('[clerk] org upsert', row)
      break
    }
    case 'organization.deleted': {
      console.log('[clerk] org deleted', evt.data.id)
      break
    }
    case 'organizationMembership.created':
    case 'organizationMembership.updated': {
      const m = evt.data
      const role = m.role.replace(/^org:/, '') === 'admin' ? 'admin' : 'editor'
      const row = {
        clerkOrgId: m.organization.id,
        clerkUserId: m.public_user_data.user_id,
        role,
      }
      // TODO: UPSERT memberships keyed on (user_id, organization_id)
      console.log('[clerk] membership upsert', row)
      break
    }
    case 'organizationMembership.deleted': {
      console.log('[clerk] membership deleted', evt.data.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
