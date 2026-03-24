import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ReviewPanel } from '@/components/review/ReviewPanel'
import type { CandidateStatus } from '@/types'

interface Props {
  params: Promise<{ token: string }>
}

// Only the fields needed for rendering — no id, review_token, or recruiter_email.
// resume_url is fetched to derive the has_resume boolean but is never forwarded to the client.
interface CandidateRow {
  full_name: string
  email: string
  linkedin_url: string | null
  recruiter_name: string | null
  recruiter_notes: string | null
  resume_url: string | null
  status: CandidateStatus
  company_id: string
  roles: { title: string; department: string | null } | null
}

export default async function ReviewPage({ params }: Props) {
  const { token } = await params

  // Regular server client is sufficient:
  // "Anyone can view candidate by review_token" uses (true), so unauthenticated reads are allowed.
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidates')
    .select('full_name, email, linkedin_url, recruiter_name, recruiter_notes, resume_url, status, company_id, roles(title, department)')
    .eq('review_token', token)
    .single()

  // Treat any error (including PGRST116 "no rows") as an invalid/expired token
  if (error || !data || !data.roles) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">Link invalid or expired</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This review link is invalid or has expired. Contact the hiring team for help.
          </p>
        </div>
      </div>
    )
  }

  // Cast via unknown — Supabase infers the nested relation as an array type,
  // but for a many-to-one FK (candidates.role_id → roles.id) it returns an object at runtime.
  const candidate = data as unknown as CandidateRow

  // Admin client needed only for company name — companies table is auth-gated by RLS.
  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', candidate.company_id)
    .single()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 py-12">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <ReviewPanel
          token={token}
          candidate={{
            full_name: candidate.full_name,
            email: candidate.email,
            linkedin_url: candidate.linkedin_url,
            recruiter_name: candidate.recruiter_name,
            recruiter_notes: candidate.recruiter_notes,
            status: candidate.status,
          }}
          role={candidate.roles!}
          companyName={company?.name ?? 'Hiring'}
          hasResume={!!candidate.resume_url}
        />
      </div>
    </div>
  )
}
