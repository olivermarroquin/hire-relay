'use client'

import { useActionState } from 'react'
import { submitDecision, type DecisionState } from './actions'
import { DecisionButtons } from '@/components/candidates/DecisionButtons'

export function DecisionForm({ candidateId, currentStatus }: { candidateId: string; currentStatus: string }) {
  const [state, formAction] = useActionState<DecisionState, FormData>(submitDecision, null)

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <textarea
        name="notes"
        placeholder="Optional note (saved with the decision)"
        rows={3}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 resize-none"
      />
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <DecisionButtons currentStatus={currentStatus} />
    </form>
  )
}
