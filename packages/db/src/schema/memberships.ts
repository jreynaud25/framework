import { index, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { membershipRoleEnum } from './enums'
import { createdAt, updatedAt, uuidPk } from './_shared'
import { organizations } from './organizations'
import { users } from './users'

export const memberships = pgTable(
  'memberships',
  {
    id: uuidPk(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    userOrgIdx: uniqueIndex('memberships_user_org_idx').on(t.userId, t.organizationId),
    orgIdx: index('memberships_organization_idx').on(t.organizationId),
  }),
)

export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
