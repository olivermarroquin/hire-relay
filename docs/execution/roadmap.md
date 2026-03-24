# Execution Roadmap

---

## Milestones

### Milestone 0 — Workspace Setup (Day 1, ~2 hours)

- [x] Repo initialized with Next.js + TypeScript + Tailwind
- [x] shadcn/ui installed and configured
- [x] Supabase project created
- [x] Migration run, seed data loaded
- [x] Resend account created, API key in env
- [x] `.env.local` populated
- [x] App runs locally at localhost:3000
- [x] Vercel project connected to repo

---

### Milestone 1 — Auth + Dashboard Shell ✅ COMPLETE

**Goal:** Hiring manager can log in and see the dashboard

- [x] `/login` page with magic link form
- [x] Supabase auth callback handler
- [x] Protected dashboard layout (proxy redirect)
- [x] `/dashboard` — list of roles with candidate counts
- [x] Supabase server client utility
- [x] Profile fetched on each dashboard load (per-request, no session cache — acceptable for MVP)

**Demo test:** Enter email → receive magic link → land on dashboard → see seeded roles

---

### Milestone 2 — Candidate Submission ✅ COMPLETE

**Goal:** Recruiter can submit a candidate using a shareable link

- [x] `/submit/[token]` — role lookup by submission_token, friendly error states for invalid/closed
- [x] Submission form component (name, email, LinkedIn, notes, recruiter name/email)
- [x] POST `/api/submit/[token]` — validates role, creates candidate, review_token DB-generated
- [x] Resume file upload — PDF only, max 5 MB, optional. Server validates MIME + size. Storage path written to `candidates.resume_url`. Upload failure rolls back candidate row.
- [x] Success confirmation screen (inline, no redirect)
- [x] Email sent to hiring manager on submission (Resend, best-effort)

**Known limitations (MVP tradeoffs):**

- Hiring manager lookup is first-match by company_id + role = 'hiring_manager'
- Email send is best-effort and does not block or fail the submission response
- API route uses service role client (bypasses RLS); token validation is the security boundary
- Submit page uses non-admin client for role lookup, admin client only for company name display
- No rate limiting or spam protection

**Demo test:** Open submission link → fill form → submit → candidate appears in dashboard

---

### Milestone 3 — Candidate Review ✅ COMPLETE

**Goal:** Hiring manager can review and decide on a candidate

- [x] `/review/[token]` — public page, candidate lookup by review_token; bad token shows friendly error
- [x] Candidate profile display (name, email, LinkedIn, recruiter notes, role + company context)
- [x] Inline PDF resume viewer (iframe → `/api/review/[token]/resume`); "Open in new tab" fallback
- [x] Decision buttons: Interview / Hold / Reject
- [x] Optional notes field
- [x] POST `/api/review/[token]/decision` — calls `apply_candidate_review_decision` RPC; atomically updates status + inserts decision row
- [x] Confirmation state after decision; "Change decision" link to re-decide
- [x] Email sent to recruiter if recruiter_email exists (Resend, best-effort)
- [x] GET `/api/review/[token]/resume` — validates token, returns signed URL redirect (1-hour expiry)

**Known limitations (MVP tradeoffs):**
- Review page is accessible to anyone with the token; tokens are UUIDs (unguessable) and do not expire
- Decision notifications are best-effort; a failed email does not fail the decision write
- Inline viewer requires a browser with PDF support; "Open in new tab" is the fallback
- Storage read policy does not enforce company scoping (acceptable while reads go through signed URLs via admin client only)

**Demo test:** Click review link from email → see candidate profile + resume → select Interview → confirmation shown → recruiter receives email

---

## Current State — 2026-03-24

**Completed:** Milestones 1, 2, 3 + resume upload/viewer enhancement

The full end-to-end recruiter → hiring manager flow is working:
- Recruiter opens submission link, fills form (including optional resume PDF), submits
- Hiring manager receives email with review link
- Hiring manager opens `/review/[token]`: sees candidate profile, inline resume viewer, makes a decision
- Decision is written atomically (RPC); recruiter notification sent best-effort
- All flows are token-scoped; no login required for public surfaces

**Next:** Milestone 4 (Task 5) — Dashboard Polish

---

### Milestone 4 — Dashboard Polish (Day 4–5)

**Goal:** Dashboard is demo-ready

- [ ] `/candidates/[id]` — full candidate profile with decision history
- [ ] Status filter tabs on dashboard: All / Pending / Interview / Hold / Rejected
- [ ] Status badge component (color-coded)
- [ ] Relative timestamps ("Submitted 2 hours ago")
- [ ] Copy submission link button per role
- [ ] Empty states (no candidates, no roles)

**Demo test:** Full flow works cleanly. Dashboard looks real. Two seeded companies don't bleed data.

---

### Milestone 5 — Deployment (Day 5–6)

**Goal:** Live URL that can be sent to pilot customers

- [ ] Vercel deployment configured
- [ ] Environment variables set in Vercel dashboard
- [ ] Supabase project on non-free plan (optional, for demo stability)
- [ ] Custom domain or clean vercel.app URL
- [ ] End-to-end test on production

---

### Milestone 6 — Week 2 (if Week 1 complete)

- [ ] Google OAuth (Supabase built-in, ~2 hours)
- [ ] Recruiter web form with login
- [ ] Role creation UI
- [ ] Decision history timeline on candidate profile
- [ ] Basic recruiter submission history

---

## Daily Rhythm

Each working session should follow this pattern:

1. Pick one milestone task
2. Open CLAUDE.md + relevant docs
3. Prompt Claude Code with the feature request
4. Review changes, test locally
5. Commit with a clear message
6. Move to next task

Do not leave a vertical slice half-built. Each task should be completable and testable in one session.
