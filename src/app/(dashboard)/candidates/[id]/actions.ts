'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendDecisionNotification } from '@/lib/email/resend'
import type { DecisionValue } from '@/types'
import { STATUS_LABELS } from '@/types'

const ALLOWED_DECISIONS: DecisionValue[] = ['interview', 'hold', 'rejected']

export type DecisionState = { error: string } | null

export async function submitDecision(
  _prevState: DecisionState,
  formData: FormData
): Promise<DecisionState> {
  const candidateId = formData.get('candidate_id')
  const decision = formData.get('decision')
  const rawNotes = formData.get('notes')

  if (typeof candidateId !== 'string' || !candidateId) {
    return { error: 'Invalid request.' }
  }
  if (typeof decision !== 'string' || !ALLOWED_DECISIONS.includes(decision as DecisionValue)) {
    return { error: 'Invalid decision value.' }
  }

  const validatedDecision = decision as DecisionValue
  // Treat notes as optional: trim whitespace, convert empty string to null.
  const notes = typeof rawNotes === 'string' ? rawNotes.trim() || null : null

  // 1. Resolve authenticated user server-side.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Resolve company_id from the authenticated user's profile.
  //    Never comes from the client.
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Account configuration error.' }

  // 3. Verify candidate ownership AND fetch review_token in one query.
  //    The authenticated (RLS-scoped) client enforces that the candidate
  //    must exist AND belong to the authenticated user's company.
  //    review_token stays server-side — it is never sent to the client
  //    and never appears in FormData. It is only used in step 4 below.
  const { data: candidate, error: ownershipError } = await supabase
    .from('candidates')
    .select('id, status, full_name, recruiter_email, review_token, roles(title)')
    .eq('id', candidateId)
    .eq('company_id', profile.company_id)
    .single()

  if (ownershipError || !candidate) {
    console.error('Decision ownership check failed:', ownershipError)
    return { error: 'Candidate not found.' }
  }

  // 4. Reject no-op: decision equals current status.
  //    Client-side disabling is a UX hint only — this is the authoritative check.
  if (candidate.status === validatedDecision) {
    return {
      error: `This candidate is already marked as ${STATUS_LABELS[validatedDecision]}.`,
    }
  }

  // 5. Apply the decision atomically via the canonical DB function.
  //    apply_candidate_review_decision updates candidates.status and inserts
  //    a decisions row inside a single transaction with a FOR UPDATE row lock,
  //    eliminating the partial-write risk of doing two separate table writes.
  //    The admin client is used here because the public review flow already
  //    uses it for this RPC call and no authenticated-client EXECUTE grant exists.
  //    Ownership was verified above — this call cannot be reached for a candidate
  //    from a different company.
  const admin = createAdminClient()
  const { data, error: rpcError } = await admin.rpc('apply_candidate_review_decision', {
    p_review_token: candidate.review_token,
    p_decision: validatedDecision,
    p_notes: notes,
  })

  if (rpcError) {
    console.error('apply_candidate_review_decision error:', rpcError)
    return { error: 'Failed to save decision. Please try again.' }
  }

  const result = data?.[0]

  if (!result) {
    console.error('apply_candidate_review_decision returned no row for candidate:', candidateId)
    return { error: 'Failed to save decision. Please try again.' }
  }

  // 5. Send recruiter notification (best-effort, non-fatal).
  if (result.recruiter_email) {
    try {
      await sendDecisionNotification({
        candidateName: result.candidate_name,
        roleTitle: result.role_title,
        decision: validatedDecision,
        notes,
        recruiterEmail: result.recruiter_email,
      })
    } catch (emailError) {
      console.error('Decision notification failed (non-fatal):', emailError)
    }
  }

  // 6. Redirect back to candidate detail with success flag.
  redirect(`/candidates/${candidateId}?decision=saved`)
}
