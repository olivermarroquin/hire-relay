# Execution Roadmap

---

## Milestones

### Milestone 0 — Workspace Setup (Day 1, ~2 hours)
- [ ] Repo initialized with Next.js + TypeScript + Tailwind
- [ ] shadcn/ui installed and configured
- [ ] Supabase project created
- [ ] Migration run, seed data loaded
- [ ] Resend account created, API key in env
- [ ] `.env.local` populated
- [ ] App runs locally at localhost:3000
- [ ] Vercel project connected to repo

---

### Milestone 1 — Auth + Dashboard Shell (Day 1–2)
**Goal:** Hiring manager can log in and see the dashboard

- [ ] `/login` page with magic link form
- [ ] Supabase auth callback handler
- [ ] Protected dashboard layout (middleware redirect)
- [ ] `/dashboard` — list of roles with candidate counts
- [ ] Supabase server client utility
- [ ] Profile fetched on login, stored in session

**Demo test:** Enter email → receive magic link → land on dashboard → see seeded roles

---

### Milestone 2 — Candidate Submission (Day 2–3)
**Goal:** Recruiter can submit a candidate using a shareable link

- [ ] `/submit/[token]` — role lookup by submission_token
- [ ] Submission form component (name, email, LinkedIn, notes, recruiter email)
- [ ] Resume file upload to Supabase Storage (optional field)
- [ ] POST `/api/submit/[token]` — validates role, creates candidate, generates review_token
- [ ] Success confirmation screen
- [ ] Email sent to hiring manager on submission (Resend)

**Demo test:** Open submission link → fill form → submit → candidate appears in dashboard

---

### Milestone 3 — Candidate Review (Day 3–4)
**Goal:** Hiring manager can review and decide on a candidate

- [ ] `/review/[token]` — public page, candidate lookup by review_token
- [ ] Candidate profile display (name, email, LinkedIn, notes, resume link)
- [ ] Decision buttons: Interview / Hold / Reject
- [ ] Optional notes field
- [ ] POST `/api/review/[token]/decision` — logs decision, updates status
- [ ] Confirmation state after decision
- [ ] Email sent to recruiter if recruiter_email exists (Resend)

**Demo test:** Click review link from email → see candidate → select Interview → confirmation shown → recruiter receives email

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
