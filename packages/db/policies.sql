-- Framework — Row Level Security policies (BRIEF §5).
-- Apply after `drizzle-kit migrate`. Idempotent: drops policies before recreating.
--
-- Multi-tenancy model:
--   - Auth: Clerk JWT carries the user UUID and the active org UUID.
--   - We map them into Postgres via `request.jwt.claims` set per-request:
--       SELECT set_config('request.jwt.claims', '{"user_id":"...","org_id":"..."}', true);
--   - Helper functions below extract those values for use in policies.
--
-- Reference: BRIEF.md §5 "RLS policies (Supabase)".

-- ---------------------------------------------------------------------------
-- 0. Helper functions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;
create schema if not exists framework;

create or replace function framework.current_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_id', '')::uuid
$$;

create or replace function framework.current_org_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')::uuid
$$;

create or replace function framework.is_member_of(target_org uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = framework.current_user_id()
      and m.organization_id = target_org
  );
$$;

create or replace function framework.is_admin_of(target_org uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = framework.current_user_id()
      and m.organization_id = target_org
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function framework.is_linked_studio_member(target_brand uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1
    from public.studio_brand_links sbl
    join public.memberships m on m.organization_id = sbl.studio_id
    where sbl.brand_id = target_brand
      and m.user_id = framework.current_user_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on every tenant-scoped table
-- ---------------------------------------------------------------------------

alter table public.users                      enable row level security;
alter table public.organizations              enable row level security;
alter table public.memberships                enable row level security;
alter table public.studio_brand_links         enable row level security;
alter table public.brand_token_versions       enable row level security;
alter table public.brand_fonts                enable row level security;
alter table public.font_license_attestations  enable row level security;
alter table public.templates                  enable row level security;
alter table public.template_versions          enable row level security;
alter table public.compositions               enable row level security;
alter table public.exports                    enable row level security;
alter table public.assets                     enable row level security;
alter table public.compliance_checks          enable row level security;
alter table public.subscriptions              enable row level security;
alter table public.commission_payouts         enable row level security;
alter table public.audit_log                  enable row level security;

-- ---------------------------------------------------------------------------
-- 2. organizations — members SELECT; owner/admin UPDATE
-- ---------------------------------------------------------------------------

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select using (framework.is_member_of(id));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update using (framework.is_admin_of(id));

-- ---------------------------------------------------------------------------
-- 3. memberships — members can SELECT memberships in their org
-- ---------------------------------------------------------------------------

drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select using (framework.is_member_of(organization_id));

drop policy if exists memberships_admin_write on public.memberships;
create policy memberships_admin_write on public.memberships
  for all using (framework.is_admin_of(organization_id))
         with check (framework.is_admin_of(organization_id));

-- ---------------------------------------------------------------------------
-- 4. brand_token_versions — brand members + linked studio members SELECT;
--    studio admins or brand owners INSERT/UPDATE
-- ---------------------------------------------------------------------------

drop policy if exists btv_select on public.brand_token_versions;
create policy btv_select on public.brand_token_versions
  for select using (
    framework.is_member_of(brand_id) or framework.is_linked_studio_member(brand_id)
  );

drop policy if exists btv_write on public.brand_token_versions;
create policy btv_write on public.brand_token_versions
  for all using (
    framework.is_admin_of(brand_id) or framework.is_linked_studio_member(brand_id)
  )
  with check (
    framework.is_admin_of(brand_id) or framework.is_linked_studio_member(brand_id)
  );

-- ---------------------------------------------------------------------------
-- 5. templates / template_versions — same as brand_token_versions
-- ---------------------------------------------------------------------------

drop policy if exists templates_select on public.templates;
create policy templates_select on public.templates
  for select using (
    framework.is_member_of(brand_id) or framework.is_linked_studio_member(brand_id)
  );

drop policy if exists templates_write on public.templates;
create policy templates_write on public.templates
  for all using (
    framework.is_admin_of(brand_id) or framework.is_linked_studio_member(brand_id)
  )
  with check (
    framework.is_admin_of(brand_id) or framework.is_linked_studio_member(brand_id)
  );

drop policy if exists template_versions_select on public.template_versions;
create policy template_versions_select on public.template_versions
  for select using (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (framework.is_member_of(t.brand_id) or framework.is_linked_studio_member(t.brand_id))
    )
  );

drop policy if exists template_versions_write on public.template_versions;
create policy template_versions_write on public.template_versions
  for all using (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (framework.is_admin_of(t.brand_id) or framework.is_linked_studio_member(t.brand_id))
    )
  )
  with check (
    exists (
      select 1 from public.templates t
      where t.id = template_id
        and (framework.is_admin_of(t.brand_id) or framework.is_linked_studio_member(t.brand_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 6. compositions — brand members CRUD their own; admins CRUD all in brand
-- ---------------------------------------------------------------------------

drop policy if exists compositions_select on public.compositions;
create policy compositions_select on public.compositions
  for select using (
    framework.is_member_of(brand_id)
  );

drop policy if exists compositions_member_write on public.compositions;
create policy compositions_member_write on public.compositions
  for all using (
    framework.is_admin_of(brand_id)
    or (framework.is_member_of(brand_id) and created_by_user_id = framework.current_user_id())
  )
  with check (
    framework.is_admin_of(brand_id)
    or (framework.is_member_of(brand_id) and created_by_user_id = framework.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- 7. exports — read-only to brand members
-- ---------------------------------------------------------------------------

drop policy if exists exports_select on public.exports;
create policy exports_select on public.exports
  for select using (
    exists (
      select 1 from public.compositions c
      where c.id = composition_id and framework.is_member_of(c.brand_id)
    )
  );

drop policy if exists exports_insert on public.exports;
create policy exports_insert on public.exports
  for insert with check (
    exists (
      select 1 from public.compositions c
      where c.id = composition_id and framework.is_member_of(c.brand_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 8. compliance_checks — read-only to brand members
-- ---------------------------------------------------------------------------

drop policy if exists compliance_checks_select on public.compliance_checks;
create policy compliance_checks_select on public.compliance_checks
  for select using (
    exists (
      select 1 from public.exports e
      join public.compositions c on c.id = e.composition_id
      where e.id = export_id and framework.is_member_of(c.brand_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 9. assets — brand members SELECT; INSERT own; admin DELETE
-- ---------------------------------------------------------------------------

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
  for select using (framework.is_member_of(brand_id));

drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets
  for insert with check (
    framework.is_member_of(brand_id)
    and uploaded_by_user_id = framework.current_user_id()
  );

drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets
  for delete using (framework.is_admin_of(brand_id));

-- ---------------------------------------------------------------------------
-- 10. brand_fonts + font_license_attestations
-- ---------------------------------------------------------------------------

drop policy if exists brand_fonts_select on public.brand_fonts;
create policy brand_fonts_select on public.brand_fonts
  for select using (
    framework.is_member_of(brand_id) or framework.is_linked_studio_member(brand_id)
  );

drop policy if exists brand_fonts_write on public.brand_fonts;
create policy brand_fonts_write on public.brand_fonts
  for all using (framework.is_admin_of(brand_id))
  with check (framework.is_admin_of(brand_id));

-- attestations are append-only and only the org admin who attested may read
drop policy if exists font_license_attestations_select on public.font_license_attestations;
create policy font_license_attestations_select on public.font_license_attestations
  for select using (
    exists (
      select 1 from public.brand_fonts bf
      where bf.id = brand_font_id and framework.is_admin_of(bf.brand_id)
    )
  );

drop policy if exists font_license_attestations_insert on public.font_license_attestations;
create policy font_license_attestations_insert on public.font_license_attestations
  for insert with check (
    exists (
      select 1 from public.brand_fonts bf
      where bf.id = brand_font_id and framework.is_admin_of(bf.brand_id)
    )
    and attested_by_user_id = framework.current_user_id()
  );

-- ---------------------------------------------------------------------------
-- 11. subscriptions, commission_payouts — only org admin SELECT
-- ---------------------------------------------------------------------------

drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select using (framework.is_admin_of(organization_id));

drop policy if exists commission_payouts_select on public.commission_payouts;
create policy commission_payouts_select on public.commission_payouts
  for select using (
    framework.is_admin_of(studio_id) or framework.is_admin_of(brand_id)
  );

-- ---------------------------------------------------------------------------
-- 12. studio_brand_links — both sides can read; only studio admins write
-- ---------------------------------------------------------------------------

drop policy if exists sbl_select on public.studio_brand_links;
create policy sbl_select on public.studio_brand_links
  for select using (
    framework.is_member_of(studio_id) or framework.is_member_of(brand_id)
  );

drop policy if exists sbl_write on public.studio_brand_links;
create policy sbl_write on public.studio_brand_links
  for all using (framework.is_admin_of(studio_id))
  with check (framework.is_admin_of(studio_id));

-- ---------------------------------------------------------------------------
-- 13. audit_log — write-anywhere from server, read by org admins
-- ---------------------------------------------------------------------------

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select using (
    organization_id is not null and framework.is_admin_of(organization_id)
  );

-- 14. users — every user reads their own row
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (id = framework.current_user_id());
