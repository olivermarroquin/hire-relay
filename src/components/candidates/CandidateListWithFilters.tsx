'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type CandidateStatus } from '@/types'
import { CandidateList, type CandidateListItem } from './CandidateList'

type FilterTab = 'all' | CandidateStatus

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'interview', label: 'Interview' },
  { value: 'hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
]

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: 'No candidates yet.',
  pending: 'No pending candidates.',
  interview: 'No interview candidates.',
  hold: 'No candidates on hold.',
  rejected: 'No rejected candidates.',
}

interface CandidateListWithFiltersProps {
  candidates: CandidateListItem[]
  roleId?: string
  roleTitle?: string | null
}

export function CandidateListWithFilters({ candidates, roleId, roleTitle }: CandidateListWithFiltersProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  // Apply role filter first (server-determined, not interactive), then status tab filter.
  const roleFiltered = roleId ? candidates.filter((c) => c.role_id === roleId) : candidates
  const filtered =
    activeTab === 'all' ? roleFiltered : roleFiltered.filter((c) => c.status === activeTab)

  const countFor = (tab: FilterTab) =>
    tab === 'all' ? roleFiltered.length : roleFiltered.filter((c) => c.status === tab).length

  return (
    <div className="space-y-3">
      {roleId && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Filtered by: {roleTitle ?? 'role'}</span>
          <Link href="/dashboard" className="font-medium text-zinc-900 hover:underline underline-offset-2">
            Clear
          </Link>
        </div>
      )}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((tab) => {
          const count = countFor(tab.value)
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  isActive ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <CandidateList candidates={filtered} emptyMessage={EMPTY_MESSAGES[activeTab]} />
    </div>
  )
}
