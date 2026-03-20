# Recruiter Collaboration — MVP

A lightweight decision layer between startups and their external recruiters.

Recruiters submit candidates. Hiring managers review and decide. Everyone stays aligned — without email threads.

---

## What This Is

- Recruiters submit candidates via a shareable link (no login required)
- Hiring managers receive email + in-app notification with a one-click review link
- Hiring managers select: Interview / Hold / Reject with optional notes
- Status is updated automatically. Decision history is logged.
- Multi-company support (seeded demo data)

## What This Is Not

- Not an ATS
- Not a sourcing tool
- Not an AI workflow engine
- Does not touch internal applicants or existing HR systems

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (magic link) |
| Styling | Tailwind CSS + shadcn/ui |
| Email | Resend |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- A Resend account (free tier works)

### Setup

```bash
# 1. Clone and install
git clone <your-repo>
cd <your-repo>
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in your Supabase + Resend keys

# 3. Run migrations
# In Supabase dashboard > SQL Editor, run files in supabase/migrations/ in order
# Then run supabase/seed.sql to load demo data

# 4. Start dev server
npm run dev
```

### Demo Accounts (after seeding)

| Role | Email | Company |
|---|---|---|
| Hiring Manager | hm@demo-acme.com | Acme Corp |
| Hiring Manager | hm@demo-vertex.com | Vertex Labs |

Login via magic link — check your Supabase Auth logs or use the Supabase dashboard to grab the link during development.

---

## Project Docs

| Doc | Purpose |
|---|---|
| `docs/product/brief.md` | Product background and positioning |
| `docs/product/mvp-scope.md` | Exact MVP scope — what's in and out |
| `docs/product/user-flows.md` | Step-by-step user flows |
| `docs/architecture/data-model.md` | Database schema and relationships |
| `docs/architecture/routes.md` | All app routes and API endpoints |
| `docs/execution/roadmap.md` | Build sequence and milestones |
| `docs/execution/decisions.md` | Log of key architectural decisions |

---

## Working With Claude Code

See `CLAUDE.md` for full instructions.

Quick version: point Claude Code at the relevant doc files before asking for feature work. Build one vertical slice at a time.
