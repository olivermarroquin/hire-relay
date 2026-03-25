import { type CandidateStatus, STATUS_LABELS, STATUS_COLORS } from '@/types'

interface CandidateStatusBadgeProps {
  status: CandidateStatus
}

export function CandidateStatusBadge({ status }: CandidateStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
