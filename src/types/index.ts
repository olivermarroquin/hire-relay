// src/types/index.ts
// All shared TypeScript types for the application
// Extend these — do not duplicate in component files

export type UserRole = 'hiring_manager' | 'recruiter' | 'admin'
export type CandidateStatus = 'pending' | 'interview' | 'hold' | 'rejected'
export type DecisionValue = 'interview' | 'hold' | 'rejected'
export type RoleStatus = 'open' | 'paused' | 'closed'

// ─────────────────────────────────────────
// Database row types (match Supabase schema)
// ─────────────────────────────────────────

export interface Company {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Profile {
  id: string
  company_id: string
  role: UserRole
  full_name: string | null
  email: string | null
  created_at: string
}

export interface Role {
  id: string
  company_id: string
  title: string
  department: string | null
  status: RoleStatus
  submission_token: string
  created_by: string | null
  created_at: string
}

export interface Candidate {
  id: string
  role_id: string
  company_id: string
  full_name: string
  email: string
  linkedin_url: string | null
  resume_url: string | null
  recruiter_notes: string | null
  recruiter_email: string | null
  recruiter_name: string | null
  status: CandidateStatus
  review_token: string
  submitted_by: string | null
  submitted_at: string
}

export interface Decision {
  id: string
  candidate_id: string
  decided_by: string | null
  decision: DecisionValue
  notes: string | null
  decided_at: string
}

// ─────────────────────────────────────────
// Enriched / joined types for UI
// ─────────────────────────────────────────

export interface CandidateWithRole extends Candidate {
  role: Pick<Role, 'id' | 'title' | 'department'>
}

export interface CandidateWithDecisions extends Candidate {
  decisions: Decision[]
  role: Pick<Role, 'id' | 'title' | 'department'>
}

export interface RoleWithCandidateCount extends Role {
  candidate_count: number
  pending_count: number
}

// ─────────────────────────────────────────
// API request/response types
// ─────────────────────────────────────────

export interface SubmitCandidatePayload {
  full_name: string
  email: string
  linkedin_url?: string
  resume_url?: string
  recruiter_notes?: string
  recruiter_email?: string
  recruiter_name?: string
}

export interface MakeDecisionPayload {
  decision: DecisionValue
  notes?: string
}

export interface ApiResponse<T = null> {
  data: T | null
  error: string | null
}

// ─────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: 'Pending Review',
  interview: 'Interview',
  hold: 'On Hold',
  rejected: 'Rejected',
}

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-green-100 text-green-800',
  hold: 'bg-blue-100 text-blue-800',
  rejected: 'bg-gray-100 text-gray-600',
}

export const DECISION_LABELS: Record<DecisionValue, string> = {
  interview: 'Move to Interview',
  hold: 'Hold',
  rejected: 'Reject',
}
