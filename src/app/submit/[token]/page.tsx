import { createClient, createAdminClient } from '@/lib/supabase/server'
import { SubmitForm } from '@/components/submit/SubmitForm'

interface Props {
  params: Promise<{ token: string }>
}

export default async function SubmitPage({ params }: Props) {
  const { token } = await params

  // Regular server client is sufficient for role lookup:
  // the "Anyone can view role by submission_token" RLS policy uses (true),
  // so unauthenticated reads are allowed.
  const supabase = await createClient()

  const { data: role } = await supabase
    .from('roles')
    .select('id, title, department, status, company_id')
    .eq('submission_token', token)
    .single()

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">Link not found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This submission link is invalid or has expired. Contact the hiring team for a new link.
          </p>
        </div>
      </div>
    )
  }

  if (role.status !== 'open') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">Role no longer open</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This role is not currently accepting submissions.
          </p>
        </div>
      </div>
    )
  }

  // Admin client needed here only for company name — companies table is auth-gated by RLS.
  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', role.company_id)
    .single()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 py-12">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {company?.name ?? 'Hiring'}
          </p>
          <h1 className="text-xl font-semibold text-zinc-900">{role.title}</h1>
          {role.department && (
            <p className="text-sm text-zinc-500">{role.department}</p>
          )}
        </div>

        <SubmitForm token={token} roleTitle={role.title} />
      </div>
    </div>
  )
}
