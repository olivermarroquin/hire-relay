# MVP Scope

**Last updated:** 2026-03-24
**Status:** Active — Milestones 1–3 + resume upload complete. Ready for Milestone 4 (Dashboard Polish).

---

## MVP Goal

Deliver a demoable end-to-end recruiter collaboration flow to 2–3 pilot companies within 2 weeks.

A pilot company should be able to:
1. Have a hiring manager log in
2. Share a submission link with a recruiter
3. Have the recruiter submit a candidate
4. Have the hiring manager receive an email + see the candidate in-app
5. Review the candidate profile and make a decision
6. Have the recruiter receive a status notification

---

## In Scope — Week 1

### Auth
- [x] Magic link login for hiring managers
- [x] No login required for recruiter submission (shareable link)
- [x] No login required for candidate review (secure token link)

### Candidate Submission (Shareable Link)
- [x] `/submit/[token]` — public submission form
- [x] Fields: candidate name, email, LinkedIn URL, resume upload (PDF only, max 5 MB, optional), recruiter notes
- [x] Submission creates candidate record in DB
- [x] Submission triggers email to hiring manager

### Hiring Manager Dashboard
- [x] `/dashboard` — list of open roles with candidate counts
- [x] `/candidates/[id]` — full candidate profile view
- [x] Status filter: All / Pending / Interview / Hold / Rejected

### Candidate Review
- [x] `/review/[token]` — secure public review page (no login)
- [x] Displays candidate profile + role context
- [x] Decision buttons: Interview / Hold / Reject
- [x] Optional notes field
- [x] Decision logged to DB
- [x] Status updated on candidate record
- [x] Recruiter notified by email on decision

### Notifications (Email via Resend)
- [x] Email to hiring manager on new submission (includes review link)
- [x] Email to recruiter on decision (if email provided at submission)

### Multi-tenancy
- [x] `company_id` on all relevant tables
- [x] Row-level security in Supabase
- [x] 2–3 seeded demo companies with hiring managers

---

## In Scope — Week 2 (if Week 1 complete)

### Recruiter Web Form (Logged-In)
- [ ] Recruiter account creation (invite only)
- [ ] `/submit` — authenticated submission form
- [ ] Recruiter sees their own submission history

### Google OAuth
- [ ] Login with Google (alongside magic link)

### Dashboard Improvements
- [ ] Role detail page showing all candidates for that role
- [ ] Decision history timeline on candidate profile

---

## Explicitly Out of Scope

| Feature | Why |
|---|---|
| Email parsing / inbox integration | Too complex, unreliable for MVP |
| Self-serve company onboarding | Not needed — demo uses seeded data |
| Recruiter marketplace | Different product |
| ATS integrations | Out of positioning |
| Mobile app | Web-first |
| AI-powered candidate ranking | Out of scope for MVP |
| Payment / billing | Pre-revenue validation |
| GDPR/compliance tooling | Post-validation |
| Internal applicant tracking | Not this product |

---

## Demo Success Criteria

The MVP is demo-ready when:
1. A recruiter can submit a candidate using a shareable link on a phone or desktop
2. A hiring manager receives an email within 60 seconds of submission
3. The hiring manager can click the review link and make a decision without logging in
4. The decision appears in the dashboard
5. The recruiter receives a status email
6. All of the above works for 2 different seeded companies without data leaking between them
