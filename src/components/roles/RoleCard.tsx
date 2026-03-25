import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RoleWithCandidateCount } from "@/types";

interface RoleCardProps {
  role: RoleWithCandidateCount;
}

export function RoleCard({ role }: RoleCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-zinc-900">{role.title}</h3>
          {role.department && (
            <Badge variant="secondary" className="text-xs">
              {role.department}
            </Badge>
          )}
        </div>

        <div className="text-right shrink-0">
          {role.pending_count > 0 ? (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              {role.pending_count} pending
            </span>
          ) : (
            <span className="text-xs text-zinc-400">No pending</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {role.candidate_count} candidate{role.candidate_count !== 1 ? "s" : ""} total
        </span>
        <Link
          href={`/dashboard?role_id=${role.id}`}
          className="text-xs font-medium text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
        >
          View candidates
        </Link>
      </div>
    </div>
  );
}
