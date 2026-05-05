import 'server-only'

export interface DesignerDashboardData {
  designerName: string
  totals: {
    lifetimeCents: number
    thisMonthCents: number
    pendingCents: number
    currency: string
    activeBrandCount: number
    activeUserCount: number
    templatesPublishedThisMonth: number
    exportsThisMonth: number
  }
  brands: BrandActivityRow[]
  pipeline: PipelineRow[]
}

export interface BrandActivityRow {
  brandId: string
  brandSlug: string
  brandName: string
  templatesPublished: number
  exportsThisMonth: number
  /** ISO timestamp */
  lastLoginAt: string | null
  mrrCents: number
  commissionCents: number
}

export interface PipelineRow {
  brandName: string
  invitedAt: string
  inviteEmail: string
  status: 'invited' | 'signed_up' | 'no_subscription'
}

/**
 * Load the dashboard payload for the currently authenticated designer.
 * Until Supabase is provisioned, returns deterministic mock data so the
 * surface can be designed and reviewed.
 */
export async function loadDesignerDashboard(): Promise<DesignerDashboardData> {
  // TODO(week 4): join organizations(type=studio) ← studio_brand_links
  //   ← organizations(type=brand) ← subscriptions ← commission_payouts.
  return MOCK
}

const MOCK: DesignerDashboardData = {
  designerName: 'Basile',
  totals: {
    lifetimeCents: 1_482_00,
    thisMonthCents: 287_00,
    pendingCents: 134_00,
    currency: 'EUR',
    activeBrandCount: 3,
    activeUserCount: 9,
    templatesPublishedThisMonth: 7,
    exportsThisMonth: 142,
  },
  brands: [
    {
      brandId: 'b-3070',
      brandSlug: '3070',
      brandName: '30 70 Agency',
      templatesPublished: 12,
      exportsThisMonth: 88,
      lastLoginAt: '2026-05-04T14:00:00Z',
      mrrCents: 299_00,
      commissionCents: 89_70,
    },
    {
      brandId: 'b-musee-x',
      brandSlug: 'musee-x',
      brandName: 'Musée X',
      templatesPublished: 4,
      exportsThisMonth: 23,
      lastLoginAt: '2026-04-28T09:15:00Z',
      mrrCents: 99_00,
      commissionCents: 29_70,
    },
    {
      brandId: 'b-maison-bleue',
      brandSlug: 'maison-bleue',
      brandName: 'Maison Bleue',
      templatesPublished: 6,
      exportsThisMonth: 31,
      lastLoginAt: '2026-04-30T16:45:00Z',
      mrrCents: 99_00,
      commissionCents: 29_70,
    },
  ],
  pipeline: [
    { brandName: 'Atelier Verre', invitedAt: '2026-05-02', inviteEmail: 'sara@atelierverre.com', status: 'signed_up' },
    { brandName: 'Studio K', invitedAt: '2026-04-25', inviteEmail: 'lou@studiok.fr', status: 'invited' },
    { brandName: 'PARIS / NIGHT', invitedAt: '2026-04-18', inviteEmail: 'mehdi@paris.night', status: 'no_subscription' },
  ],
}
