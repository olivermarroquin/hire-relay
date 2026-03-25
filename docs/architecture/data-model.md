# Data Model

---

## Overview

All data is scoped by `company_id`. Every query that returns candidate, role, or profile data must filter by the authenticated user's company. This is enforced at the application layer and by Supabase Row Level Security (RLS) policies.

---

## Entity Relationships

```
companies
  └── profiles (users belong to one company)
  └── roles (open positions belong to one company)
        └── candidates (submitted against a role)
              └── decisions (append-only decision log)
              └── candidate_collaboration_entries (append-only internal feed)
```

---

## Table Definitions

### `companies`
Tenant isolation. One row per customer company.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| name | text | Display name (e.g. "Acme Corp") |
| slug | text | URL-safe identifier (e.g. "acme-corp") |
| created_at | timestamptz | default now() |

---

### `profiles`
Extends Supabase auth.users. Created automatically on first login via trigger.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, references auth.users(id) |
| company_id | uuid | FK → companies.id |
| role | text | 'hiring_manager' \| 'recruiter' \| 'admin' |
| full_name | text | |
| email | text | Mirrors auth.users email |
| created_at | timestamptz | default now() |

---

### `roles`
Open positions at a company. Hiring managers create these.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK → companies.id |
| title | text | e.g. "Senior Backend Engineer" |
| department | text | e.g. "Engineering" |
| status | text | 'open' \| 'paused' \| 'closed' |
| submission_token | uuid | Used in shareable link: /submit/[submission_token] |
| created_by | uuid | FK → profiles.id |
| created_at | timestamptz | |

**Note:** submission_token is separate from the candidate review_token. The submission_token identifies the role (public). The review_token identifies a specific candidate review (semi-private).

---

### `candidates`
Submitted against a role. Can come from shareable link or (later) authenticated recruiter.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| role_id | uuid | FK → roles.id |
| company_id | uuid | FK → companies.id (denormalized for RLS) |
| full_name | text | Required |
| email | text | Required |
| linkedin_url | text | Optional |
| resume_url | text | Supabase Storage object path (e.g. `{candidate_id}/resume.pdf`), optional. Never a URL — signed URLs are generated on demand at read time. |
| recruiter_notes | text | Optional |
| recruiter_email | text | Optional — for status notifications |
| recruiter_name | text | Optional |
| status | text | 'pending' \| 'interview' \| 'hold' \| 'rejected' |
| review_token | uuid | For secure /review/[token] link — unique per candidate |
| submitted_by | uuid | FK → profiles.id, nullable (null = shareable link submission) |
| submitted_at | timestamptz | default now() |
| owner_profile_id | uuid | FK → profiles.id, nullable. Current internal owner of this candidate (e.g. the interviewer assigned). Set by server actions only — never from client. |
| owner_updated_at | timestamptz | When owner_profile_id was last changed. Null if never assigned. |

---

### `candidate_collaboration_entries`
Append-only internal feed. No edit or delete in MVP. One row per note, feedback item, handoff, or update event.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| candidate_id | uuid | FK → candidates.id, on delete cascade |
| company_id | uuid | FK → companies.id, on delete cascade (denormalized for RLS — derived server-side, never from client) |
| author_profile_id | uuid | FK → profiles.id, nullable. Null allowed for system-generated entries; in MVP always set to the authenticated user's profile id. |
| entry_type | text | 'note' \| 'interview_feedback' \| 'handoff' \| 'update' |
| body | text | Required. Full text of the entry. |
| visibility | text | 'internal' (default) \| 'recruiter_visible'. UI for recruiter_visible is out of scope for MVP. |
| created_at | timestamptz | default now() |

**Note:** `company_id` is denormalized here (same as on `candidates`) to keep the RLS SELECT policy a simple equality check without a sub-select join through `candidates`.

---

### `decisions`
Append-only log. Decisions are never deleted or updated — new row on each change.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| candidate_id | uuid | FK → candidates.id |
| decided_by | uuid | FK → profiles.id |
| decision | text | 'interview' \| 'hold' \| 'rejected' |
| notes | text | Optional internal notes |
| decided_at | timestamptz | default now() |

The current status on `candidates.status` is the source of truth for display. `decisions` is the audit trail.

---

## Row Level Security Summary

| Table | Policy |
|---|---|
| companies | Users can only read their own company |
| profiles | Users can only read profiles in their company |
| roles | Users can only CRUD roles in their company |
| candidates | Users can only read/update candidates where company_id matches |
| candidates (insert) | Anyone can insert — no auth required; API route uses service role, token validation is the boundary |
| candidates (select by token) | Anyone can select a single candidate by review_token — no auth required |
| decisions | Users can only read decisions for candidates in their company |
| decisions (insert) | Anyone can insert — guarded by the `apply_candidate_review_decision` RPC (security definer) |
| candidate_collaboration_entries | Authenticated users can read and insert entries for their own company only. No UPDATE or DELETE in MVP. |

---

## Supabase Storage

| Bucket | Access | Purpose |
|---|---|---|
| resumes | Private (signed URLs) | Resume file uploads from submission form |

---

## Submission flow — field sourcing

When a candidate is inserted via `POST /api/submit/[token]`:

| Field | Source |
|---|---|
| `role_id` | Derived server-side from role matched by `submission_token` |
| `company_id` | Derived server-side from same role — client cannot control tenant |
| `status` | Always `'pending'` on insert |
| `review_token` | DB default (`gen_random_uuid()`) — not client-supplied |
| `full_name`, `email`, `linkedin_url` | Client-provided, validated and normalized server-side |
| `recruiter_name`, `recruiter_email`, `recruiter_notes` | Client-provided, optional |
| `resume_url` | Set server-side after storage upload (path: `{candidate_id}/resume.pdf`). Null if no file provided. Never client-supplied. |
| `submitted_by` | `null` for shareable link submissions (no auth) |

---

## Migration Files

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Initial tables, RLS policies, storage bucket |
| `supabase/migrations/002_fix_rls_policies.sql` | Fixes circular RLS bootstrap on profiles; adds `public.get_my_company_id()` security definer function; rewrites all company-scoped policies to use it |
| `supabase/migrations/003_review_decision_function.sql` | Adds `public.apply_candidate_review_decision()` plpgsql function — atomically updates `candidates.status` and inserts a `decisions` row in one transaction |
| `supabase/migrations/004_collaboration_schema.sql` | Adds `owner_profile_id`/`owner_updated_at` to `candidates`; creates `candidate_collaboration_entries` table with RLS; fixes `candidates` UPDATE policy to use `get_my_company_id()` |

Run migrations in order. Never edit existing migration files.

## Seed File

See `supabase/seed.sql` — creates 2 demo companies with hiring managers and open roles.
