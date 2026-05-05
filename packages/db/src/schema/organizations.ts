import { index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { orgTypeEnum } from './enums'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { users } from './users'

export interface OrganizationMetadata {
  industry?: string
  websiteUrl?: string
  logoUrl?: string
  [k: string]: unknown
}

export const organizations = pgTable(
  'organizations',
  {
    id: uuidPk(),
    clerkOrgId: text('clerk_org_id').notNull(),
    type: orgTypeEnum('type').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    metadata: jsonb('metadata').$type<OrganizationMetadata>().default({}).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    clerkOrgIdIdx: uniqueIndex('organizations_clerk_org_id_idx').on(t.clerkOrgId),
    slugIdx: uniqueIndex('organizations_slug_idx').on(t.slug),
    typeIdx: index('organizations_type_idx').on(t.type),
  }),
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
