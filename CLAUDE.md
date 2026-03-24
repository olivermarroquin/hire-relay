# CLAUDE.md — Recruiter Collaboration MVP

## Role

You are an engineering partner helping build a focused, demoable MVP. Your primary obligation is to the product and the user, not to engineering elegance. Speed and clarity beat sophistication at this stage.

---

## Project Summary

A lightweight recruiter collaboration app where:

- External recruiters submit candidates via shareable link or web form
- Hiring managers receive email + in-app notifications
- Hiring managers review profiles and select: Interview / Hold / Reject
- Status is tracked, history is logged, recruiter is notified
- Multi-company (seeded demo data, not self-serve onboarding yet)

This is an **app-first product**. It is not an AI workflow engine.

---

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 14 (App Router)                             |
| Language   | TypeScript                                          |
| Database   | Supabase (Postgres)                                 |
| Auth       | Supabase Auth (magic link → Google OAuth in week 2) |
| Styling    | Tailwind CSS + shadcn/ui                            |
| Email      | Resend                                              |
| Deployment | Vercel                                              |

---

## Critical Working Rules

### Before writing any code

1. Read the relevant doc file(s) in `docs/` first
2. Identify every file you will touch before touching any of them
3. Propose the minimal change that solves the problem
4. State any tradeoffs clearly

### While coding

- Build one vertical slice at a time (route → API → DB → UI)
- Prefer editing existing patterns over creating new ones
- Do not add abstractions that aren't immediately needed
- Do not install new packages without flagging it first
- Keep components small and focused
- Use TypeScript types from `src/types/index.ts` — extend them, don't duplicate

### Scope discipline

- If a request is outside `docs/product/mvp-scope.md`, say so explicitly before proceeding
- Never gold-plate. Ask: "is this needed for the demo?"
- If you're unsure whether something is in scope, ask before building it

### Docs alignment

- If a decision changes the data model, update `docs/architecture/data-model.md`
- If scope changes, flag it and update `docs/product/mvp-scope.md`
- Log significant decisions in `docs/execution/decisions.md`

### Database migrations

- Never edit existing migration files — they are an immutable record of what ran
- Every schema or RLS policy change gets a new numbered file: `supabase/migrations/003_...sql`, `004_...sql`, etc.
- Use `drop policy if exists` before recreating policies so migrations are safe to re-run
- RLS policies must use `public.get_my_company_id()` instead of subquerying `profiles` directly — the subquery pattern causes a circular RLS bootstrap loop on the profiles table

---

## Project Structure

```
src/
  app/
    (auth)/login/         ← magic link login page
    (auth)/callback/      ← Supabase auth callback handler
    (dashboard)/          ← protected layout for hiring managers
      dashboard/          ← HM overview: open roles + recent candidates
      candidates/[id]/    ← candidate detail view
      roles/              ← role management
    review/[token]/       ← public secure review page (no login needed)
    submit/[roleId]/      ← public candidate submission form
    api/                  ← all API routes
  components/
    ui/                   ← shadcn components (do not modify directly)
    candidates/           ← CandidateCard, CandidateList, DecisionButtons
    roles/                ← RoleCard
    review/               ← ReviewPanel
    submit/               ← SubmitForm
  lib/
    supabase/client.ts    ← browser client
    supabase/server.ts    ← server client (for API routes + server components)
    email/resend.ts       ← email sending helpers
    utils.ts              ← shared utilities
  types/index.ts          ← all shared TypeScript types
supabase/
  migrations/             ← SQL migration files (run in order)
  seed.sql                ← demo company + user seed data
docs/
  product/brief.md
  product/mvp-scope.md
  product/user-flows.md
  architecture/data-model.md
  architecture/routes.md
  execution/roadmap.md
  execution/decisions.md
```

---

## Data Model (summary — see docs/architecture/data-model.md for full schema)

- `companies` — tenant isolation
- `profiles` — extends Supabase auth users, holds role + company
- `roles` — open positions per company
- `candidates` — submitted against a role, hold review_token for secure links
- `decisions` — append-only log of Interview/Hold/Reject decisions

**Key constraint:** Every DB query must filter by `company_id`. Never return cross-company data.

---

## Auth Model

- Hiring managers: magic link login → dashboard
- Recruiters (shareable link flow): no auth required — submit via `/submit/[roleId]`
- Review links: `/review/[token]` — token is a UUID stored on the candidate row, no auth

---

## Email Events (via Resend)

| Trigger             | Recipient                     | Template                                       |
| ------------------- | ----------------------------- | ---------------------------------------------- |
| Candidate submitted | Hiring manager                | "New candidate ready for review" + review link |
| Decision made       | Recruiter (if email provided) | "Status update: [name] → [decision]"           |

---

## How to Prompt Me Effectively

When asking for feature work, structure your request like this:

```
Feature: [name]
Relevant docs: [doc files to read first]
Relevant existing files: [files I should look at]
What it should do: [user-facing behavior]
What it should NOT do: [scope boundary]
```

For bug fixes:

```
Bug: [what's broken]
File: [where]
Expected: [what should happen]
Actual: [what is happening]
```

---

## What I Will Not Do Without Asking

- Add a new dependency
- Change the database schema
- Modify the auth flow
- Refactor more than the files needed for the current task
- Build something not in mvp-scope.md

---

## Deployment

- Preview deploys: Vercel (auto on PR)
- Production: Vercel main branch
- Env vars: set in Vercel dashboard + `.env.local` locally (see `.env.local.example`)
