# User Flows

---

## Flow 1 — Recruiter Submits a Candidate (Shareable Link) ✅ IMPLEMENTED

**Actor:** External recruiter (no account required)
**Entry point:** Shareable URL provided by hiring manager

```
1. Hiring manager copies submission link for a role
   → URL: /submit/[submission_token]

2. Recruiter opens link in browser (no login required)
   → Server validates submission_token against roles table
   → Sees role title, department, company name, and submission form

3. Recruiter fills in:
   - Candidate full name (required)
   - Candidate email (required, validated + lowercased server-side)
   - LinkedIn URL (optional)
   - Recruiter name (optional)
   - Recruiter email (optional — for status updates)
   - Notes for hiring team (optional)
   Note: resume upload deferred to Week 2

4. Recruiter submits form → POST /api/submit/[token]
   → Token re-validated server-side
   → role_id and company_id derived from matched role (client cannot supply these)
   → Candidate record created (status: pending, review_token DB-generated)
   → Email sent to hiring manager via Resend (best-effort, non-blocking)
   → Confirmation message shown inline (no page redirect)
```

**Error states:**
- Required fields missing → inline validation, form not submitted
- Invalid email format → 400, inline error message
- Token not found → "Link not found" full-page error state
- Role not open → "Role no longer open" full-page error state

---

## Flow 2 — Hiring Manager Reviews a Candidate (Email Link)

**Actor:** Hiring manager
**Entry point:** Email notification

```
1. Hiring manager receives email: "New candidate submitted for [Role]"
   → Email contains: candidate name, role, recruiter notes snippet
   → Email contains: "Review Candidate" button → /review/[token]

2. Hiring manager clicks link (no login required)
   → Sees full candidate profile:
     - Name, email, LinkedIn
     - Resume (if uploaded)
     - Recruiter notes
     - Role and company context

3. Hiring manager selects a decision:
   - Interview
   - Hold
   - Reject

4. (Optional) Hiring manager adds internal notes

5. Hiring manager clicks "Submit Decision"
   → Decision logged to decisions table
   → Candidate status updated
   → If recruiter email was provided: notification email sent
   → Confirmation shown: "Decision recorded"
```

**Edge cases:**
- Token already used (decision already made) → show current status, allow changing decision
- Token expired (future feature) → prompt to log in

---

## Flow 3 — Hiring Manager Uses Dashboard (Logged In)

**Actor:** Hiring manager
**Entry point:** /login → magic link → /dashboard

```
1. Hiring manager goes to /login
   → Enters email
   → Receives magic link email
   → Clicks link → redirected to /dashboard

2. Dashboard shows:
   - Open roles (with pending candidate count)
   - Recent submissions (last 7 days)
   - Quick status filters: All / Pending / Interview / Hold / Rejected

3. Hiring manager clicks a candidate
   → /candidates/[id]
   → Same review interface as email flow
   → Can make or update decision

4. Hiring manager can copy submission link for any open role
   → Share with recruiter externally
```

---

## Flow 4 — Recruiter Receives Status Update

**Actor:** External recruiter
**Trigger:** Hiring manager makes a decision

```
1. Hiring manager submits decision on candidate
2. System checks: does candidate record have a recruiter_email?
3. If yes → send status email:
   "Update on [Candidate Name]: The team has decided to [Interview / Hold / Pass]"
   Optional notes included if hiring manager added them

4. Recruiter has no further action required in this flow
   (Recruiter login and submission history is Week 2 scope)
```

---

## Key UX Principles

- **No unnecessary logins.** Recruiters submit without accounts. Hiring managers can review without logging in via the token link.
- **One decision action.** The review page has one job: show the candidate, capture the decision.
- **Email is notification only.** It is never the system of record. All state lives in the database.
- **Status is always visible.** Every candidate has a clear status at all times.
