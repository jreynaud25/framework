# @framework/db

Drizzle schema + Supabase Postgres client + RLS policies.

## Layout

```
packages/db/
├── drizzle.config.ts          # drizzle-kit config (postgres dialect, snake_case)
├── policies.sql               # RLS policies (apply after `drizzle-kit migrate`)
├── migrations/                # generated SQL (gitignored .snapshots)
└── src/
    ├── client.ts              # postgres-js + drizzle singleton
    ├── index.ts               # re-exports
    └── schema/
        ├── index.ts
        ├── enums.ts
        ├── _shared.ts         # uuidPk(), createdAt(), updatedAt()
        ├── users.ts
        ├── organizations.ts
        ├── memberships.ts
        ├── studio-brand-links.ts
        ├── brand-token-versions.ts
        ├── brand-fonts.ts
        ├── font-license-attestations.ts
        ├── templates.ts
        ├── template-versions.ts
        ├── compositions.ts
        ├── exports.ts
        ├── assets.ts
        ├── compliance-checks.ts
        ├── subscriptions.ts
        ├── commission-payouts.ts
        └── audit-log.ts
```

## Usage

```bash
# generate SQL migrations from schema
pnpm --filter @framework/db db:generate

# apply migrations to DATABASE_URL
pnpm --filter @framework/db db:migrate

# apply RLS policies (run AFTER first migration)
psql "$DATABASE_URL" -f policies.sql

# inspect data
pnpm --filter @framework/db db:studio
```

## Multi-tenant context

RLS policies read `request.jwt.claims` for `user_id` and `org_id`. The web/api
layers must set this per-request:

```ts
await db.execute(sql`select set_config('request.jwt.claims', ${jwtClaims}, true)`)
```

Helper functions live in the `framework` schema (`current_user_id()`,
`is_member_of()`, `is_admin_of()`, `is_linked_studio_member()`).
