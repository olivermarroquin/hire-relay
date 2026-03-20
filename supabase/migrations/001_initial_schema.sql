-- Migration: 001_initial_schema.sql
-- Run this in Supabase SQL Editor

-- ─────────────────────────────────────────
-- COMPANIES
-- ─────────────────────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  role text not null default 'hiring_manager'
    check (role in ('hiring_manager', 'recruiter', 'admin')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- ROLES (open positions)
-- ─────────────────────────────────────────
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text,
  status text not null default 'open'
    check (status in ('open', 'paused', 'closed')),
  submission_token uuid not null default gen_random_uuid() unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- CANDIDATES
-- ─────────────────────────────────────────
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  linkedin_url text,
  resume_url text,
  recruiter_notes text,
  recruiter_email text,
  recruiter_name text,
  status text not null default 'pending'
    check (status in ('pending', 'interview', 'hold', 'rejected')),
  review_token uuid not null default gen_random_uuid() unique,
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- DECISIONS (append-only audit log)
-- ─────────────────────────────────────────
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  decided_by uuid references public.profiles(id),
  decision text not null
    check (decision in ('interview', 'hold', 'rejected')),
  notes text,
  decided_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.candidates enable row level security;
alter table public.decisions enable row level security;

-- Companies: authenticated users see only their company
create policy "Users see own company"
  on public.companies for select
  using (
    id in (select company_id from public.profiles where id = auth.uid())
  );

-- Profiles: users see profiles in their company
create policy "Users see profiles in their company"
  on public.profiles for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Users update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Roles: company-scoped CRUD
create policy "Users see roles in their company"
  on public.roles for select
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Hiring managers manage roles"
  on public.roles for all
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

-- Public role lookup by submission_token (for submission form)
create policy "Anyone can view role by submission_token"
  on public.roles for select
  using (true); -- filtered in application by submission_token match

-- Candidates: company-scoped for authenticated users
create policy "Users see candidates in their company"
  on public.candidates for select
  using (
    auth.uid() is not null and
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

create policy "Authenticated users update candidates in their company"
  on public.candidates for update
  using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

-- Public candidate insert (for shareable link submission)
create policy "Anyone can submit a candidate"
  on public.candidates for insert
  with check (true); -- role validation done in API route

-- Public candidate select by review_token (for review page)
create policy "Anyone can view candidate by review_token"
  on public.candidates for select
  using (true); -- filtered in application by review_token match

-- Decisions: company-scoped for authenticated, public insert by token (handled in API)
create policy "Users see decisions for their company candidates"
  on public.decisions for select
  using (
    candidate_id in (
      select id from public.candidates
      where company_id in (select company_id from public.profiles where id = auth.uid())
    )
  );

create policy "Anyone can insert a decision"
  on public.decisions for insert
  with check (true); -- token validation done in API route

-- Storage: resume uploads (public insert, private read via signed URL)
create policy "Anyone can upload resume"
  on storage.objects for insert
  with check (bucket_id = 'resumes');

create policy "Authenticated users can read resumes in their company"
  on storage.objects for select
  using (auth.uid() is not null and bucket_id = 'resumes');
