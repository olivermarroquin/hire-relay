-- Migration: 004_collaboration_schema.sql
--
-- Adds internal candidate ownership tracking and the collaboration feed.
-- Introduces:
--   1. candidates.owner_profile_id / owner_updated_at — current owner of the
--      candidate within the hiring team (nullable; set and updated by server actions only)
--   2. candidate_collaboration_entries — append-only internal feed for notes,
--      interview feedback, handoffs, and status updates (internal use only in MVP)
--   3. Fixes the candidates UPDATE RLS policy from 001_initial_schema.sql which
--      still used the old circular subquery pattern. Behavior is equivalent — only
--      the implementation is changed to use get_my_company_id() consistently.

-- ─────────────────────────────────────────
-- 1. CANDIDATES: ownership tracking columns
-- ─────────────────────────────────────────
alter table public.candidates
  add column if not exists owner_profile_id uuid references public.profiles(id),
  add column if not exists owner_updated_at timestamptz;

-- ─────────────────────────────────────────
-- 2. CANDIDATE COLLABORATION ENTRIES
-- ─────────────────────────────────────────
create table if not exists public.candidate_collaboration_entries (
  id                uuid        primary key default gen_random_uuid(),
  candidate_id      uuid        not null references public.candidates(id) on delete cascade,
  company_id        uuid        not null references public.companies(id)  on delete cascade,
  author_profile_id uuid        references public.profiles(id),
  entry_type        text        not null
    check (entry_type in ('note', 'interview_feedback', 'handoff', 'update')),
  body              text        not null,
  visibility        text        not null default 'internal'
    check (visibility in ('internal', 'recruiter_visible')),
  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 3. RLS — candidate_collaboration_entries
-- ─────────────────────────────────────────
alter table public.candidate_collaboration_entries enable row level security;

-- SELECT: authenticated users see only entries that belong to their company.
-- company_id is denormalized on the table to avoid a join through candidates.
drop policy if exists "Users see collaboration entries for their company"
  on public.candidate_collaboration_entries;

create policy "Users see collaboration entries for their company"
  on public.candidate_collaboration_entries for select
  using (
    auth.uid() is not null
    and company_id = public.get_my_company_id()
  );

-- INSERT: server actions first verify the candidate belongs to the authenticated
-- user's company, then derive company_id from the candidate row for the insert.
-- The WITH CHECK prevents any insert where company_id does not match the
-- caller's own company — even if a request somehow bypasses the application layer.
drop policy if exists "Users insert collaboration entries for their company"
  on public.candidate_collaboration_entries;

create policy "Users insert collaboration entries for their company"
  on public.candidate_collaboration_entries for insert
  with check (
    auth.uid() is not null
    and company_id = public.get_my_company_id()
  );

-- No UPDATE or DELETE policies — the feed is append-only in MVP.

-- ─────────────────────────────────────────
-- 4. CANDIDATES: fix UPDATE policy
-- ─────────────────────────────────────────
-- 001_initial_schema.sql created this policy using the old circular subquery
-- pattern (company_id in (select company_id from profiles where id = auth.uid())).
-- 002_fix_rls_policies.sql fixed SELECT but left UPDATE untouched.
-- This migration rewrites it to use get_my_company_id() so all candidates
-- policies are consistent. Semantics are identical.
drop policy if exists "Authenticated users update candidates in their company"
  on public.candidates;

create policy "Authenticated users update candidates in their company"
  on public.candidates for update
  using (
    auth.uid() is not null
    and company_id = public.get_my_company_id()
  )
  with check (
    auth.uid() is not null
    and company_id = public.get_my_company_id()
  );
