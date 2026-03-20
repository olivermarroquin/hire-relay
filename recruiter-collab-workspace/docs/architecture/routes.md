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
| `/submit/[roleId]` | None | Public candidate submission form |

**Note:** `roleId` in `/submit/[roleId]` is actually the `submission_token` from the `roles` table (a UUID). This is safe to expose publicly.

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
| GET | `/api/submit/[token]` | None | Get role info by submission_token (for form) |
| POST | `/api/submit/[token]` | None | Submit candidate against role |

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
