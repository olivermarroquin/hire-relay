import Link from 'next/link'
import { type CandidateStatus } from '@/types'
import { CandidateStatusBadge } from './CandidateStatusBadge'

// Narrow view-model type — matches exactly the columns selected in the dashboard query.
// Exported so the dashboard page can use it for the cast.
export interface CandidateListItem {
  id: string
  role_id: string
  full_name: string
  email: string
  status: CandidateStatus
  submitted_at: string
  roles: { title: string; department: string | null } | null
}

interface CandidateListProps {
  candidates: CandidateListItem[]
  emptyMessage?: string
}

export function CandidateList({ candidates, emptyMessage = 'No candidates yet.' }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {candidates.map((c) => (
            <tr key={c.id} className="hover:bg-zinc-50">
              <td className="px-4 py-3">
                <Link href={`/candidates/${c.id}`} className="font-medium text-zinc-900 hover:underline underline-offset-2">
                  {c.full_name}
                </Link>
                <p className="text-zinc-400">{c.email}</p>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {c.roles?.title ?? '—'}
              </td>
              <td className="px-4 py-3">
                <CandidateStatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {new Date(c.submitted_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
