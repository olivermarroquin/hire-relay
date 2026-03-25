'use client'

import { useFormStatus } from 'react-dom'
import { DECISION_LABELS, type DecisionValue } from '@/types'

const DECISIONS: DecisionValue[] = ['interview', 'hold', 'rejected']

export function DecisionButtons() {
  const { pending } = useFormStatus()

  return (
    <div className="flex flex-wrap gap-2">
      {DECISIONS.map((value) => (
        <button
          key={value}
          type="submit"
          name="decision"
          value={value}
          disabled={pending}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : DECISION_LABELS[value]}
        </button>
      ))}
    </div>
  )
}
