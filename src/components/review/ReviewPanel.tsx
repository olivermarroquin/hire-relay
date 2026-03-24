'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  type CandidateStatus,
  type DecisionValue,
  STATUS_LABELS,
  STATUS_COLORS,
  DECISION_LABELS,
} from '@/types'

interface CandidateProp {
  full_name: string
  email: string
  linkedin_url: string | null
  recruiter_name: string | null
  recruiter_notes: string | null
  status: CandidateStatus
}

interface ReviewPanelProps {
  token: string
  candidate: CandidateProp
  role: { title: string; department: string | null }
  companyName: string
  hasResume: boolean
}

const DECISIONS: DecisionValue[] = ['interview', 'hold', 'rejected']

export function ReviewPanel({ token, candidate, role, companyName, hasResume }: ReviewPanelProps) {
  const [status, setStatus] = useState<CandidateStatus>(candidate.status)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmedDecision, setConfirmedDecision] = useState<DecisionValue | null>(null)

  async function handleDecision(decision: DecisionValue) {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/review/${token}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes: notes.trim() || undefined }),
    })

    if (res.ok) {
      setStatus(decision)
      setNotes('')
      setConfirmedDecision(decision)
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{companyName}</p>
        <h1 className="text-xl font-semibold text-zinc-900">{candidate.full_name}</h1>
        <p className="text-sm text-zinc-500">{candidate.email}</p>
        {candidate.linkedin_url && (
          <a
            href={candidate.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            LinkedIn profile →
          </a>
        )}
        {hasResume && (
          <a
            href={`/api/review/${token}/resume`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            View resume →
          </a>
        )}
      </div>

      {/* Role context */}
      <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm">
        <p className="font-medium text-zinc-700">{role.title}</p>
        {role.department && <p className="text-zinc-500">{role.department}</p>}
      </div>

      {/* Recruiter info */}
      {(candidate.recruiter_name || candidate.recruiter_notes) && (
        <div className="space-y-1.5">
          {candidate.recruiter_name && (
            <p className="text-xs text-zinc-400">
              Submitted by <span className="font-medium text-zinc-600">{candidate.recruiter_name}</span>
            </p>
          )}
          {candidate.recruiter_notes && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Recruiter notes
              </p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{candidate.recruiter_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Current status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Current status:</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Decision area */}
      {confirmedDecision ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-base font-semibold text-green-800">Decision recorded</p>
          <p className="mt-1 text-sm text-green-700">
            {DECISION_LABELS[confirmedDecision]} — status updated.
          </p>
          <button
            onClick={() => setConfirmedDecision(null)}
            className="mt-3 text-xs text-green-600 underline underline-offset-2 hover:text-green-800"
          >
            Change decision
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any context for your team…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-3 gap-2">
            {DECISIONS.map((d) => (
              <Button
                key={d}
                variant={d === 'rejected' ? 'destructive' : d === 'interview' ? 'default' : 'outline'}
                disabled={loading}
                onClick={() => handleDecision(d)}
              >
                {DECISION_LABELS[d]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
