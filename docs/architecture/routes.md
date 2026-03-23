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

## API Routes (Next.js Route Handlers)

### Candidates

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/candidates` | Required | List candidates for company (with filters) |
| GET | `/api/candidates/[id]` | Required | Single candidate detail |
| PATCH | `/api/candidates/[id]/decision` | Optional (token) | Submit a decision |

### Roles

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/roles` | Required | List roles for company |
| POST | `/api/roles` | Required | Create a new role |
| GET | `/api/roles/[id]` | Required | Single role detail |

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
| GET | `/api/review/[token]` | None | Get candidate by review_token |
| POST | `/api/review/[token]/decision` | None | Submit decision by review_token |

---

## Query Params

### GET /api/candidates
- `status` — filter by CandidateStatus (optional)
- `role_id` — filter by role (optional)
- `limit` — default 50
- `offset` — default 0

---

## URL Construction Examples

| Context | URL |
|---|---|
| Recruiter submission link | `https://app.com/submit/[role.submission_token]` |
| Hiring manager review link (in email) | `https://app.com/review/[candidate.review_token]` |
| Candidate detail (logged-in) | `https://app.com/candidates/[candidate.id]` |
