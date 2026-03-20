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
| resume_url | text | Supabase Storage URL, optional |
| recruiter_notes | text | Optional |
| recruiter_email | text | Optional — for status notifications |
| recruiter_name | text | Optional |
| status | text | 'pending' \| 'interview' \| 'hold' \| 'rejected' |
| review_token | uuid | For secure /review/[token] link — unique per candidate |
| submitted_by | uuid | FK → profiles.id, nullable (null = shareable link submission) |
| submitted_at | timestamptz | default now() |

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
| candidates | Users can only read/write candidates where company_id matches |
| decisions | Users can only read/write decisions for candidates in their company |
| candidates (insert) | Anyone can insert if role's submission_token matches — no auth required |
| candidates (select by token) | Anyone can select a single candidate by review_token — no auth required |

---

## Supabase Storage

| Bucket | Access | Purpose |
|---|---|---|
| resumes | Private (signed URLs) | Resume file uploads from submission form |

---

## Migration File

See `supabase/migrations/001_initial_schema.sql`

## Seed File

See `supabase/seed.sql` — creates 2 demo companies with hiring managers and open roles.
