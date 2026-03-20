# Decision Log

A running record of key architectural and product decisions made during the build.

---

## Template

```
### [Date] — [Short title]
**Decision:** What was decided
**Rationale:** Why
**Alternatives considered:** What else was weighed
**Impact:** What this affects
```

---

### [Day 1] — Next.js App Router over Pages Router
**Decision:** Use App Router with server components
**Rationale:** App Router is the current Next.js standard. Server components simplify data fetching for dashboard views. Better Supabase SSR integration.
**Alternatives considered:** Pages Router (more familiar, more tutorials), Remix
**Impact:** All routing, layouts, and data fetching patterns follow App Router conventions

---

### [Day 1] — Supabase over PlanetScale + separate auth
**Decision:** Use Supabase for Postgres + auth + storage
**Rationale:** Single platform, free tier covers MVP, built-in RLS for multi-tenancy, magic link auth ships out of the box, Claude Code knows it well
**Alternatives considered:** PlanetScale + Auth.js (no free tier, more config), Express + Supabase (unnecessary split)
**Impact:** Auth, DB queries, storage all use Supabase client libraries

---

### [Day 1] — Magic link auth (not password)
**Decision:** Magic link as primary auth method
**Rationale:** Fits the product model (hiring managers already click email links). No password management. Supabase ships it natively.
**Alternatives considered:** Email + password (more friction, more work), Google OAuth (week 2 addition)
**Impact:** Login flow is email-only. Hiring managers need valid email access.

---

### [Day 1] — Seeded multi-tenancy (not self-serve onboarding)
**Decision:** 2–3 demo companies seeded in DB, no self-serve signup
**Rationale:** Self-serve company onboarding is 3–5 days of work. Demo doesn't need it.
**Alternatives considered:** Full multi-tenant onboarding (correct long-term, wrong for MVP week)
**Impact:** New companies added manually via seed scripts during validation phase

---

### [Day 1] — Shareable link submission (no recruiter auth) as Week 1 priority
**Decision:** `/submit/[submission_token]` — no login required
**Rationale:** Shareable link removes recruiter onboarding friction entirely. Core value prop is decision speed, not recruiter account management.
**Alternatives considered:** Recruiter login first (more complex, less differentiating)
**Impact:** Recruiters have zero onboarding. Submission_token on roles is the access control.

---

<!-- Add new decisions below as you make them -->
