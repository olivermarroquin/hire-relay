# Routes

---

## App Routes (Next.js App Router)

| Route | Auth | Purpose |
|---|---|---|
| `/` | None | Landing / redirect to login or dashboard |
| `/login` | None | Magic link login form |
| `/auth/callback` | None | Supabase auth callback handler |
| `/dashboard` | Required (HM) | Overview: open roles + recent candidates |
| `/candidates/[id]` | Required (HM) | Full candidate profile + decision UI |
| `/roles` | Required (HM) | Role list + copy submission link |
| `/review/[token]` | None | Public candidate review (secure token) |
| `/submit/[token]` | None | Public candidate submission form |

**Note:** `token` in `/submit/[token]` is the `submission_token` from the `roles` table (a UUID). Safe to expose publicly. Invalid token → "Link not found" state. Closed role → "Role no longer open" state.

---

**Note:** The dashboard pages (`/dashboard`, `/candidates/[id]`, `/roles`) are all Next.js server components. They fetch data directly via the Supabase server client — there are no REST API routes for candidates or roles.

---

## API Routes (Next.js Route Handlers)

### Submission

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/submit/[token]` | None | Not implemented — page fetches role directly in server component |
| POST | `/api/submit/[token]` | None | Submit candidate against role |

**POST `/api/submit/[token]` details:**
- Validates `submission_token` against `roles` table; returns 404 if not found, 400 if role not open
- Validates required fields: `full_name`, `email` (format-checked, lowercased)
- Normalizes `recruiter_email` (lowercased, format-checked if provided)
- Derives `role_id` and `company_id` server-side from matched role — not accepted from client
- `review_token` is DB-generated (uuid default), not supplied by client
- After insert, sends Resend notification to hiring manager (best-effort, non-blocking)
- Response: `{ success: true, candidateId: string }`
- Uses service role client (RLS bypassed); token validation is the security boundary

### Review

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/review/[token]/decision` | None | Submit decision by review_token (calls `apply_candidate_review_decision` RPC — atomic) |
| GET | `/api/review/[token]/resume` | None | Validates review_token, returns 302 redirect to a 1-hour signed storage URL |

**Note:** There is no `GET /api/review/[token]` API route. The review page at `/review/[token]` is a Next.js server component that fetches the candidate directly.

**GET `/api/review/[token]/resume` details:**
- Validates `review_token` against `candidates` table using admin client
- Returns 404 if token is invalid or `resume_url` is null
- Generates a 1-hour signed URL server-side via `supabase.storage.createSignedUrl()`
- Returns `302` redirect to signed URL — raw storage path is never sent to the client
- Used as the `src` for the inline PDF iframe on the review page

---

## Query Params

### GET /dashboard
- `role_id` — filter candidate list to a specific role (optional); resolved server-side, passed to client component

### GET /candidates/[id]
- `decision` — set to `saved` on redirect after a successful decision submission; triggers success banner

---

## URL Construction Examples

| Context | URL |
|---|---|
| Recruiter submission link | `https://app.com/submit/[role.submission_token]` |
| Hiring manager review link (in email) | `https://app.com/review/[candidate.review_token]` |
| Candidate detail (logged-in) | `https://app.com/candidates/[candidate.id]` |
