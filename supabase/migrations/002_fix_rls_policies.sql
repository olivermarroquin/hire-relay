-- Migration: 002_fix_rls_policies.sql
-- Replaces circular subquery RLS policies with get_my_company_id() helper.
-- The original policies queried profiles to get company_id, which caused a
-- bootstrap loop on the profiles table itself.

-- ─────────────────────────────────────────
-- HELPER FUNCTION
-- security definer bypasses RLS so it can read profiles without triggering
-- the profiles policy — breaking the circular dependency.
-- ─────────────────────────────────────────
create or replace function public.get_my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
drop policy if exists "Users see profiles in their company" on public.profiles;

create policy "Users read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users see profiles in their company"
  on public.profiles for select
  using (company_id = public.get_my_company_id());

-- ─────────────────────────────────────────
-- COMPANIES
-- ─────────────────────────────────────────
drop policy if exists "Users see own company" on public.companies;

create policy "Users see own company"
  on public.companies for select
  using (id = public.get_my_company_id());

-- ─────────────────────────────────────────
-- ROLES
-- ─────────────────────────────────────────
drop policy if exists "Users see roles in their company" on public.roles;

create policy "Users see roles in their company"
  on public.roles for select
  using (company_id = public.get_my_company_id());

-- ─────────────────────────────────────────
-- CANDIDATES
-- ─────────────────────────────────────────
drop policy if exists "Users see candidates in their company" on public.candidates;

create policy "Users see candidates in their company"
  on public.candidates for select
  using (
    auth.uid() is not null
    and company_id = public.get_my_company_id()
  );

-- ─────────────────────────────────────────
-- DECISIONS
-- ─────────────────────────────────────────
drop policy if exists "Users see decisions for their company candidates" on public.decisions;

create policy "Users see decisions for their company candidates"
  on public.decisions for select
  using (
    candidate_id in (
      select id from public.candidates
      where company_id = public.get_my_company_id()
    )
  );
