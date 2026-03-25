'use client'

import { useActionState } from 'react'
import { assignOwner, type AssignOwnerState } from './actions'

interface AssignOwnerFormProps {
  candidateId: string
  currentOwnerId: string | null
  profiles: { id: string; full_name: string | null; email: string | null }[]
}

export function AssignOwnerForm({ candidateId, currentOwnerId, profiles }: AssignOwnerFormProps) {
  const [state, formAction, isPending] = useActionState<AssignOwnerState, FormData>(assignOwner, null)

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <div className="flex gap-2">
        <select
          name="owner_profile_id"
          defaultValue={currentOwnerId ?? ''}
          disabled={isPending}
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 disabled:opacity-50"
        >
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? p.email ?? 'Unknown'}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Assign'}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  )
}
