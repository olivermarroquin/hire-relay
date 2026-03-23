# Recruiter Collaboration — Workspace Setup Guide

## A. MVP Definition

**Core loop (Week 1):**
Recruiter submits candidate via shareable link → Hiring manager receives email with review link → Hiring manager makes decision (Interview / Hold / Reject) → Recruiter receives status email → Decision logged in dashboard

**Out of scope for Week 1:**

- Recruiter accounts / login
- Email parsing
- Self-serve company onboarding
- Role creation UI (add via seed/SQL for now)
- Google OAuth (Week 2)

**Demo success = all 5 steps of the core loop work end-to-end on a live URL.**

---

## B. Tech Stack

| Layer      | Choice                              | Why                                                                   |
| ---------- | ----------------------------------- | --------------------------------------------------------------------- |
| Framework  | Next.js 14 (App Router, TypeScript) | Full-stack in one repo, great DX, scales                              |
| Database   | Supabase (Postgres + RLS)           | Auth + DB + Storage in one, free tier, built-in multi-tenancy via RLS |
| Auth       | Supabase magic link                 | Fits the product model, ships in one day                              |
| Styling    | Tailwind CSS + shadcn/ui            | Fastest path to a polished UI                                         |
| Email      | Resend                              | Simple API, reliable delivery, generous free tier                     |
| Deployment | Vercel                              | Zero-config Next.js deployment, preview URLs                          |

**Scales because:** Supabase runs on Postgres (no migrations needed when you grow), Next.js handles millions of requests, Vercel auto-scales, RLS-based multi-tenancy is production-grade.

---

## C. Repo Structure

```
/
├── CLAUDE.md                        ← Claude Code instructions
├── README.md                        ← Project overview + setup
├── .env.local.example               ← Env var template
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json                  ← shadcn/ui config
│
├── docs/
│   ├── product/
│   │   ├── brief.md                 ← Product background
│   │   ├── mvp-scope.md             ← Exact MVP scope
│   │   └── user-flows.md            ← Step-by-step user flows
│   ├── architecture/
│   │   ├── data-model.md            ← DB schema + relationships
│   │   └── routes.md                ← All routes + API endpoints
│   └── execution/
│       ├── roadmap.md               ← Build milestones
│       └── decisions.md             ← Architecture decision log
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   ← Full schema + RLS policies
│   └── seed.sql                     ← Demo companies + users
│
├── src/
│   ├── middleware.ts                 ← Auth protection for dashboard routes
│   ├── types/
│   │   └── index.ts                 ← All shared TypeScript types
│   │
│   ├── app/
│   │   ├── layout.tsx               ← Root layout
│   │   ├── page.tsx                 ← Root redirect
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       ← Magic link login
│   │   │   └── callback/route.ts    ← Supabase auth callback
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           ← Protected layout + nav
│   │   │   ├── dashboard/page.tsx   ← HM overview
│   │   │   ├── candidates/
│   │   │   │   └── [id]/page.tsx    ← Candidate detail
│   │   │   └── roles/
│   │   │       └── page.tsx         ← Role list
│   │   ├── review/
│   │   │   └── [token]/page.tsx     ← Public review page
│   │   ├── submit/
│   │   │   └── [token]/page.tsx     ← Public submission form
│   │   └── api/
│   │       ├── candidates/
│   │       │   ├── route.ts
│   │       │   └── [id]/decision/route.ts
│   │       ├── roles/route.ts
│   │       ├── submit/[token]/route.ts
│   │       └── review/[token]/
│   │           ├── route.ts
│   │           └── decision/route.ts
│   │
│   ├── components/
│   │   ├── ui/                      ← shadcn components (don't edit)
│   │   ├── candidates/
│   │   │   ├── CandidateCard.tsx
│   │   │   ├── CandidateList.tsx
│   │   │   └── DecisionButtons.tsx
│   │   ├── roles/
│   │   │   └── RoleCard.tsx
│   │   ├── review/
│   │   │   └── ReviewPanel.tsx
│   │   └── submit/
│   │       └── SubmitForm.tsx
│   │
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts            ← Browser Supabase client
│       │   └── server.ts            ← Server Supabase client
│       ├── email/
│       │   └── resend.ts            ← Email sending helpers
│       └── utils.ts                 ← Shared utilities (cn, formatDate, etc.)
```

---

## D. Step-by-Step Bootstrap Plan

### Phase 1 — Create the project (Terminal)

```bash
npx create-next-app@latest recruiter-collab \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd recruiter-collab
```

### Phase 2 — Install dependencies

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# shadcn/ui
npx shadcn@latest init
# When prompted: Default style, Slate, CSS variables: yes

# Install shadcn components you'll need
npx shadcn@latest add button card badge input label textarea separator

# Resend
npm install resend

# Utilities
npm install clsx tailwind-merge lucide-react date-fns
```

### Phase 3 — Create all folders

```bash
mkdir -p src/lib/supabase src/lib/email src/types
mkdir -p src/app/\(auth\)/login src/app/\(auth\)/callback
mkdir -p src/app/\(dashboard\)/dashboard
mkdir -p src/app/\(dashboard\)/candidates/\[id\]
mkdir -p src/app/\(dashboard\)/roles
mkdir -p src/app/review/\[token\]
mkdir -p src/app/submit/\[token\]
mkdir -p src/app/api/candidates/\[id\]/decision
mkdir -p src/app/api/roles
mkdir -p src/app/api/submit/\[token\]
mkdir -p src/app/api/review/\[token\]/decision
mkdir -p src/components/{candidates,roles,review,submit}
mkdir -p docs/{product,architecture,execution}
mkdir -p supabase/migrations
```

### Phase 4 — Paste generated files

Copy each file from this guide into the correct path in your repo:

| File                   | Destination                                   |
| ---------------------- | --------------------------------------------- |
| CLAUDE.md              | `/CLAUDE.md`                                  |
| README.md              | `/README.md`                                  |
| .env.local.example     | `/.env.local.example`                         |
| 001_initial_schema.sql | `/supabase/migrations/001_initial_schema.sql` |
| seed.sql               | `/supabase/seed.sql`                          |
| index.ts (types)       | `/src/types/index.ts`                         |
| brief.md               | `/docs/product/brief.md`                      |
| mvp-scope.md           | `/docs/product/mvp-scope.md`                  |
| user-flows.md          | `/docs/product/user-flows.md`                 |
| data-model.md          | `/docs/architecture/data-model.md`            |
| routes.md              | `/docs/architecture/routes.md`                |
| roadmap.md             | `/docs/execution/roadmap.md`                  |
| decisions.md           | `/docs/execution/decisions.md`                |

### Phase 5 — Configure environment

```bash
cp .env.local.example .env.local
# Open .env.local and fill in:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - RESEND_API_KEY
# - RESEND_FROM_EMAIL
# - NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Phase 6 — Set up Supabase

1. Create project at supabase.com
2. Go to **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`
3. Go to **Authentication > Users** → create two users:
   - `hm@demo-acme.com`
   - `hm@demo-vertex.com`
4. Copy their UUIDs from the Users table
5. Update `supabase/seed.sql` with the real UUIDs
6. Run `supabase/seed.sql` in SQL Editor
7. Go to **Storage** → confirm `resumes` bucket was created

### Phase 7 — Start building

```bash
npm run dev
# → http://localhost:3000
```

### Phase 8 — Connect to Vercel

```bash
# Push to GitHub first
git init && git add . && git commit -m "initial workspace setup"
git remote add origin <your-github-repo>
git push -u origin main

# Then connect at vercel.com
# Set all env vars in Vercel dashboard (same as .env.local)
```

---

## E. First 5 Implementation Tasks for Claude Code

### Task 1 — Supabase Clients + Auth Callback

Before you paste the prompt, do this:

Open the relevant files in VS Code first
Open CLAUDE.md and docs/architecture/data-model.md as active tabs. Claude Code picks up open files as context automatically.

**Prompt for Claude Code:**

```
We're building the recruiter-collab MVP. Read CLAUDE.md and docs/architecture/data-model.md before writing any code.

Feature: Supabase client setup and auth callback
Relevant docs: docs/architecture/data-model.md, CLAUDE.md
Files to create:
  - src/lib/supabase/client.ts (browser client)
  - src/lib/supabase/server.ts (server client using @supabase/ssr)
  - src/middleware.ts (protect /dashboard routes, redirect to /login)
  - src/app/(auth)/callback/route.ts (handle Supabase magic link callback)
  - src/lib/utils.ts (cn() helper using clsx + tailwind-merge)

The server client must use cookies for session. The middleware should protect
all routes under /(dashboard). On callback success, redirect to /dashboard.
Do not add any UI yet. Just the plumbing.
```

**After Claude Code responds**
Before accepting any file writes:

1. Read every file it proposes — especially server.ts. The @supabase/ssr cookie pattern has a specific shape; make sure it's using createServerClient with cookies() from next/headers, not the old createClient pattern
2. Check middleware.ts — the matcher should include /(dashboard)/(.\*) and exclude static assets
3. Run npm run dev — confirm no TypeScript errors
4. Test the callback — go to /login (doesn't exist yet, so just hit /auth/callback directly or check the route file looks right)

Then commit before moving to Task 2:
bashgit add . && git commit -m "feat: supabase client setup, auth middleware, callback handler

---

### Task 2 — Login Page + Dashboard Shell

Open these files first in VS Code
CLAUDE.md, docs/product/user-flows.md, docs/architecture/routes.md, src/types/index.ts

**Prompt for Claude Code:**

```
We're building the recruiter-collab MVP. Read CLAUDE.md, docs/product/user-flows.md, and docs/architecture/routes.md before writing any code.

Feature: Login page and dashboard shell
Files to create:
  - src/app/(auth)/login/page.tsx (magic link form using shadcn Input + Button)
  - src/app/(dashboard)/layout.tsx (protected layout with simple sidebar nav: Dashboard, Roles — show logged-in user email)
  - src/app/(dashboard)/dashboard/page.tsx (server component — fetch roles with candidate counts from Supabase, display as role cards)
  - src/components/roles/RoleCard.tsx (shows role title, department, pending candidate count)
  - src/app/page.tsx (root redirect — if logged in go to /dashboard, if not go to /login)

Use shadcn Button and Input components. Use Tailwind for layout.
Dashboard page should fetch from Supabase server client using the seeded roles data.
RoleCard should show role title, department badge, and a count of pending candidates.
Keep design clean and minimal — no heavy chrome, no complex nav.
Do not build role creation UI. Roles come from seeded data only.
```

---

### Task 3 — Candidate Submission (Shareable Link)

Resend Curl Test:
curl -X POST https://api.resend.com/emails \
 -H "Authorization: Bearer re_gkrwWnR8_Mexw8kDNgHQJpC7FHtiyMF3X" \
 -H "Content-Type: application/json" \
 -H "User-Agent: recruiter-collab-mvp/1.0" \
 -d '{
"from": "Test <onboarding@resend.dev>",
"to": ["oliver.marroquin31217@gmail.com"],
"subject": "Test",
"html": "<p>Resend works</p>"
}'

**Prompt for Claude Code:**

```
We're building the recruiter-collab MVP. Before writing code, read:
- CLAUDE.md
- docs/product/user-flows.md
- docs/architecture/data-model.md
- docs/architecture/routes.md
- src/types/index.ts

Feature: Public candidate submission form (shareable link flow)

Important constraints:
- This flow is intentionally PUBLIC: no auth required
- Do NOT add auth/session checks to the submit page or submit API route
- Do NOT trust any client-provided company_id or role_id
- company_id and role_id must be derived server-side from the role matched by submission_token
- Validate submission_token on the server before rendering the form, and again in the POST handler
- Do NOT weaken or bypass existing RLS policies
- Keep this as a simple MVP vertical slice; do not add resume upload yet
- Use existing types from src/types/index.ts; do not redefine duplicate types
- Prefer the simplest correct implementation over extra abstractions

Files to create:

1) src/app/submit/[token]/page.tsx
- Server component
- Read token from params
- Query roles table by submission_token
- If role not found or role.status !== 'open', render a friendly error state
- If found, render basic role info and pass only the minimum required role data into SubmitForm
- This page must remain publicly accessible

2) src/components/submit/SubmitForm.tsx
- Client component
- Fields:
  - full_name (required)
  - email (required)
  - linkedin_url (optional)
  - recruiter_notes (optional, textarea)
  - recruiter_name (optional)
  - recruiter_email (optional)
- On submit, POST JSON to /api/submit/[token]
- On success, replace the form inline with a confirmation message
- On error, show an inline error message
- Do not send company_id, role_id, or review_token from the client

3) src/app/api/submit/[token]/route.ts
- Public POST handler
- Steps:
  1. Read token from route params
  2. Look up role by submission_token
  3. If not found or not open, return 404 or 400 with safe JSON error
  4. Validate required request body fields
  5. Insert candidate using:
     - company_id from the matched role
     - role_id from the matched role
     - status: 'pending'
     - recruiter_name / recruiter_email / recruiter_notes from request body
     - full_name / email / linkedin_url from request body
  6. Do not accept company_id or role_id from request body
  7. review_token should come from DB default generation
  8. After insert, fetch/return the inserted row including review_token
  9. Call sendSubmissionNotification()
  10. Return { success: true }

4) src/lib/email/resend.ts
- Use the Resend SDK
- Use RESEND_API_KEY and RESEND_FROM_EMAIL from env
- Implement:
  - sendSubmissionNotification({ candidateName, roleTitle, companyName, recruiterName, recruiterNotes, reviewToken, hiringManagerEmail })
    - sends email to hiring manager
    - review link = APP URL + '/review/' + reviewToken
    - subject: "New candidate for review: [candidateName] — [roleTitle]"
    - body: concise candidate summary + clear review link
  - sendDecisionNotification(...) as a placeholder for Task 4

Environment notes:
- Use RESEND_API_KEY
- Use RESEND_FROM_EMAIL
- Use app base URL from env for review links
- Avoid using NEXT_PUBLIC_* unless the value truly needs to be exposed to the browser

Implementation rules:
- Do not add styling libraries or form libraries
- Do not add resume upload
- Do not add extra abstractions unless necessary
- Keep error handling simple and explicit
- If an insert is blocked by RLS, stop and explain exactly why before changing policies
- Do not silently switch to insecure patterns

What to verify after each file:
1. TypeScript compiles
2. Public submit page loads with a valid token
3. Invalid token shows friendly error state
4. Form submits successfully
5. Candidate row is inserted with correct company_id and role_id
6. review_token exists on inserted row
7. Confirmation message appears inline
8. Email send is attempted after successful insert

After coding, give me:
- a summary of what changed
- any RLS issues encountered
- exact manual test steps
- any env vars I still need to set
```

---

### Task 4 — Candidate Review Page

**Prompt for Claude Code:**

```
Feature: Public candidate review page (token-based, no login)
Relevant docs: docs/product/user-flows.md, docs/architecture/routes.md, docs/architecture/data-model.md
Files to create:
  - src/app/review/[token]/page.tsx (server component, lookup candidate by review_token)
  - src/components/review/ReviewPanel.tsx (client component with decision UI)
  - src/app/api/review/[token]/decision/route.ts (POST: log decision, update candidate status, send recruiter email)
  - src/lib/email/resend.ts (add sendDecisionNotification function)

Review page shows: candidate name, email, LinkedIn URL, role title, recruiter notes.
Decision buttons: Interview / Hold / Reject.
Optional notes textarea.
After decision: show confirmation state (do not navigate away).
If review_token not found: show friendly error page.
Send recruiter email only if recruiter_email exists on the candidate record.
```

---

### Task 5 — Dashboard Candidate List + Status Filtering

**Prompt for Claude Code:**

```
Feature: Candidate list with status filter on dashboard
Relevant docs: docs/product/mvp-scope.md, docs/architecture/routes.md
Files to create/edit:
  - src/app/(dashboard)/dashboard/page.tsx (add recent candidates section below roles)
  - src/components/candidates/CandidateCard.tsx (name, role, status badge, submitted time)
  - src/components/candidates/CandidateList.tsx (list with status filter tabs)
  - src/app/(dashboard)/candidates/[id]/page.tsx (full candidate detail — same UI as review page but within dashboard layout)
  - src/app/api/candidates/route.ts (GET with optional status filter)

Status filter tabs: All / Pending / Interview / Hold / Rejected
Use STATUS_LABELS and STATUS_COLORS from src/types/index.ts for badges.
Candidate card should link to /candidates/[id].
The candidate detail page should allow making/updating a decision (user is logged in).
Keep design consistent with dashboard shell.
```

---

## F. How to Use Claude Code in VS Code Day-to-Day

### Starting a session

Always open these files before prompting:

- `CLAUDE.md`
- The relevant `docs/` file(s)
- The existing file(s) you're building on

In Claude Code, use `@file` references to include them in context:

```
@CLAUDE.md @docs/product/user-flows.md
Feature: [what you're building]
```

### Prompting for feature work

Use this structure every time:

```
Feature: [name]
Relevant docs: [list doc files]
Files to create/edit: [list files]
What it should do: [user-facing behavior]
What it should NOT do: [scope guard]
```

### Keeping Claude Code from drifting

- If it suggests something outside scope, say: _"That's outside mvp-scope.md. Let's stay focused on [current task]."_
- If it wants to refactor something unrelated, say: _"Note that for later. Don't change it now."_
- If it installs a new package, ask: _"Is this necessary or can we use what's already installed?"_
- After every 2–3 tasks, re-attach `CLAUDE.md` to reset context

### Reviewing changes

Before accepting any change:

1. Read the diff — don't just approve
2. Check that only the intended files were modified
3. Run the app locally and test the specific flow
4. If something looks overengineered, ask: _"Can this be simpler?"_

### Building in slices

One task = one vertical slice = one commit.

```
git add .
git commit -m "feat: [task name] — [what it does]"
```

Never leave a half-built feature uncommitted overnight.
