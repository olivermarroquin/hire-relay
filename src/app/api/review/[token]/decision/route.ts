import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendDecisionNotification } from '@/lib/email/resend'
import type { DecisionValue } from '@/types'

const ALLOWED_DECISIONS: DecisionValue[] = ['interview', 'hold', 'rejected']
const NOTES_MAX_LENGTH = 2000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  // 1. Parse body — treat as fully untrusted input
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { decision, notes } = rawBody as Record<string, unknown>

  // 2. Validate decision
  if (!decision || !ALLOWED_DECISIONS.includes(decision as DecisionValue)) {
    return NextResponse.json(
      { error: `decision must be one of: ${ALLOWED_DECISIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // 3. Validate notes — must be string or absent; cap length
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string' }, { status: 400 })
  }

  const trimmedNotes = typeof notes === 'string' ? notes.trim() : null

  if (trimmedNotes && trimmedNotes.length > NOTES_MAX_LENGTH) {
    return NextResponse.json(
      { error: `notes must be ${NOTES_MAX_LENGTH} characters or fewer` },
      { status: 400 }
    )
  }

  const sanitizedNotes = trimmedNotes || null
  const validatedDecision = decision as DecisionValue

  // 4. Execute status update + decision insert atomically via DB function
  const { data, error: rpcError } = await supabase.rpc('apply_candidate_review_decision', {
    p_review_token: token,
    p_decision: validatedDecision,
    p_notes: sanitizedNotes,
  })

  if (rpcError) {
    if (rpcError.message === 'candidate_not_found' || rpcError.code === '22P02') {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }
    if (rpcError.message === 'invalid_decision') {
      return NextResponse.json(
        { error: `decision must be one of: ${ALLOWED_DECISIONS.join(', ')}` },
        { status: 400 }
      )
    }
    console.error('apply_candidate_review_decision error:', rpcError)
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 })
  }

  const result = data?.[0]

  if (!result) {
    console.error('apply_candidate_review_decision returned no row for token:', token)
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 })
  }

  // 5. Send recruiter notification if email is present (best-effort, non-fatal)
  if (result?.recruiter_email) {
    try {
      await sendDecisionNotification({
        candidateName: result.candidate_name,
        roleTitle: result.role_title,
        decision: validatedDecision,
        notes: sanitizedNotes,
        recruiterEmail: result.recruiter_email,
      })
    } catch (emailError) {
      console.error('Decision notification failed (non-fatal):', emailError)
    }
  }

  return NextResponse.json({
    success: true,
    decision: validatedDecision,
    candidateName: result?.candidate_name ?? '',
  })
}
