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

### [2026-03-24] — RLS circular bootstrap fix via security definer function
**Decision:** Replace all `company_id in (select company_id from profiles where id = auth.uid())` subquery patterns with a `public.get_my_company_id()` security definer function
**Rationale:** The subquery pattern is self-referential on the profiles table — evaluating the profiles RLS policy requires reading profiles, which requires the policy, causing an infinite loop and returning no rows. The security definer function bypasses RLS to read the caller's own profile row safely.
**Alternatives considered:** Storing company_id in the JWT (requires custom claims setup, more complexity)
**Impact:** All company-scoped RLS policies use `get_my_company_id()`. New policies must follow this pattern. Documented in CLAUDE.md under database migration rules.

---

### [2026-03-24] — Transactional decision write path via plpgsql function
**Decision:** Replace separate `candidates.update()` + `decisions.insert()` calls in the decision API route with a single `apply_candidate_review_decision()` RPC call
**Rationale:** The two-step approach could leave `candidates.status` updated but no corresponding `decisions` row inserted (or vice versa) if anything failed between the two calls. A single plpgsql function executes both inside one transaction with a `FOR UPDATE` row lock to prevent concurrent interleaving.
**Alternatives considered:** DB transaction via Supabase (not directly supported in the JS client without a custom function), accepting the non-atomic risk (ruled out — decisions table is the audit log)
**Impact:** `supabase/migrations/003_review_decision_function.sql`. API route uses `supabase.rpc()`. The function also returns candidate/role data needed for the recruiter notification, removing the separate role lookup.

---

### [2026-03-24] — Store storage object path in resume_url, not a URL
**Decision:** `candidates.resume_url` holds the Supabase Storage object path (e.g. `{candidate_id}/resume.pdf`), not a signed URL or public URL
**Rationale:** Signed URLs expire. Storing a signed URL in the DB would silently go stale. Storing the path and generating signed URLs on demand at read time ensures they are always fresh.
**Alternatives considered:** Public URL (requires public bucket — unacceptable for private resumes), pre-signed URL stored in DB (stale after expiry)
**Impact:** `GET /api/review/[token]/resume` calls `createSignedUrl()` on every request. Raw storage path is never sent to the client.

---

### [2026-03-24] — PDF only for resume upload (not doc/docx)
**Decision:** Resume upload accepts PDF only (MIME: `application/pdf`, max 5 MB)
**Rationale:** Browsers natively render PDFs in iframes and new tabs. doc/docx files trigger a download instead of inline display, which would break the review page's inline viewer without adding an external conversion dependency. Server-side MIME validation prevents bypassing the restriction via a renamed file.
**Alternatives considered:** doc/docx support (requires conversion service or native viewer — out of MVP scope), no file type restriction (security and UX risk)
**Impact:** Submit form shows "PDF only, max 5 MB". Server rejects non-PDF MIME types with 400. File input uses `accept=".pdf,application/pdf"` as a UI hint only.

### [2026-03-24] — Inline PDF viewer on review page via iframe + secure route
**Decision:** Render resume inline on `/review/[token]` using an `<iframe src="/api/review/[token]/resume">` rather than a link-only approach or an embedded PDF library
**Rationale:** The secure route already issues a 302 redirect to a signed URL; browsers follow redirects transparently inside iframes and render PDFs natively. This adds no dependencies and no code beyond the iframe tag. A "Open in new tab" fallback link handles browsers without native PDF rendering.
**Alternatives considered:** Simple link only (worse HM UX — requires navigation away from the decision area), PDF.js or react-pdf (external dependency, overkill for MVP), streaming file through server (more complexity, no benefit over iframe+redirect for this use case)
**Impact:** ReviewPanel renders `<iframe>` when `hasResume` is true. The raw storage path and signed URL never appear in client-visible HTML — only the opaque secure route URL is in the `src` attribute.

### [2026-03-25] — Dashboard decision form reuses `apply_candidate_review_decision` RPC
**Decision:** The authenticated dashboard decision action (`/candidates/[id]/actions.ts`) calls the same `apply_candidate_review_decision` plpgsql RPC as the public review flow, rather than doing its own separate table writes.
**Rationale:** The RPC already provides the correct atomicity guarantee (status update + decision row in one transaction with FOR UPDATE lock). Duplicating the write logic in the dashboard path would introduce a second code path with split-write integrity risk. The `review_token` is fetched server-side during the ownership check and passed to the RPC — it never reaches the client.
**Alternatives considered:** Direct `candidates.update()` + `decisions.insert()` from the server action (rejected — non-atomic, same integrity risk that prompted the RPC in Milestone 3)
**Impact:** Single canonical write path for decisions regardless of entry point. `review_token` stays internal to the server action. Ownership must always be verified before calling the RPC.

---

### [2026-03-25] — `useActionState` + `useFormStatus` for server action feedback
**Decision:** Use React 19's `useActionState` (not the deprecated `useFormState`) with a `DecisionState = { error: string } | null` shape for in-page error feedback. Use `useFormStatus` inside a child component for pending state during submission.
**Rationale:** Server actions that redirect on success don't need to return anything — only error cases need state. `useActionState` keeps the error inline without a separate error state atom. `useFormStatus` must live in a child of `<form>` (not in the form component itself) — hence the `DecisionButtons` child component handles pending state independently.
**Alternatives considered:** `useState` + manual fetch (bypasses form action pattern), `useFormState` (deprecated in React 19), toast/global state (overkill for a single form)
**Impact:** `DecisionForm` owns the form + state; `DecisionButtons` is a focused child that reads `useFormStatus`. Success case redirects server-side via `redirect()`, so no client-side success state is needed — the `?decision=saved` query param on the redirect URL triggers the success banner in the server component.

---

### [2026-03-25] — No-op duplicate decision prevention is server-authoritative
**Decision:** After the ownership check in the server action, if `candidate.status === validatedDecision`, return an error immediately without calling the RPC.
**Rationale:** The client disables the button for the current status, but this is a UX hint only — it can be bypassed. The server-side check is the authoritative guard. The error message is user-facing ("This candidate is already marked as…") so the hiring manager understands what happened.
**Alternatives considered:** Let the RPC handle it silently (would succeed or no-op without feedback), skip the check (allows redundant decision rows in history)
**Impact:** Decision history stays clean — no duplicate rows for the same status. Users get immediate, clear feedback on no-op attempts.

<!-- Add new decisions below as you make them -->
