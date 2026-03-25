import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CandidateStatusBadge } from "@/components/candidates/CandidateStatusBadge";
import type { CandidateStatus } from "@/types";
import { DECISION_LABELS } from "@/types";
import { DecisionForm } from "./DecisionForm";
import { AssignOwnerForm } from "./AssignOwnerForm";
import { CollaborationEntryForm } from "./CollaborationEntryForm";

// ─── Collaboration feed display constants ────────────────────────────────────
// Local to this page — not shared globally since they are only used here.

const ENTRY_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  interview_feedback: "Interview feedback",
  handoff: "Handoff",
  update: "Update",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  note: "bg-zinc-100 text-zinc-600",
  interview_feedback: "bg-blue-100 text-blue-700",
  handoff: "bg-purple-100 text-purple-700",
  update: "bg-amber-100 text-amber-700",
};

const VISIBILITY_LABELS: Record<string, string> = {
  internal: "Internal",
  recruiter_visible: "Recruiter visible",
};

const VISIBILITY_COLORS: Record<string, string> = {
  internal: "bg-zinc-100 text-zinc-500",
  recruiter_visible: "bg-teal-100 text-teal-700",
};

interface CandidateDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ decision?: string; collab?: string }>;
}

export default async function CandidateDetailPage({ params, searchParams }: CandidateDetailPageProps) {
  const { id } = await params;
  const { decision, collab } = await searchParams;

  // 1. Resolve authenticated user server-side.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Resolve company_id from the authenticated user's profile.
  //    This never comes from the client — it is read from the DB using the
  //    server-verified session.
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No profile found. Contact your administrator.
      </div>
    );
  }

  // 3. Fetch the candidate scoped to BOTH the requested id AND the authenticated
  //    user's company_id. A matching id alone is not sufficient — the company_id
  //    filter ensures a hiring manager from company A can never read a candidate
  //    row belonging to company B, even if they guess a valid UUID.
  //    owner:profiles!owner_profile_id joins the owner's profile inline (nullable FK).
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select(
      `
      id,
      full_name,
      email,
      status,
      submitted_at,
      linkedin_url,
      resume_url,
      owner_profile_id,
      owner_updated_at,
      roles(title, department),
      owner:profiles!owner_profile_id(id, full_name, email)
    `
    )
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  // 4. If no row is returned — either the candidate doesn't exist or belongs to
  //    a different company — render 404. Do not distinguish the two cases.
  //    PGRST116 = .single() found zero rows — expected for any inaccessible candidate.
  //    Any other error code is unexpected (DB or RLS misconfiguration) and worth logging.
  if (!candidate) {
    if (candidateError && candidateError.code !== "PGRST116") {
      console.error("Candidate detail fetch error:", candidateError);
    }
    notFound();
  }

  // Supabase infers FK relations as arrays; cast each to the runtime shape.
  const role = candidate.roles as unknown as { title: string; department: string | null } | null;
  const owner = candidate.owner as unknown as { id: string; full_name: string | null; email: string | null } | null;

  // Type for a collaboration entry row including the author FK join.
  type CollabEntryRow = {
    id: string
    entry_type: string
    body: string
    visibility: string
    author_profile_id: string | null
    created_at: string
    author: { full_name: string | null; email: string | null } | null
  }

  // 5. Fetch decision history for this candidate.
  //    candidate.id was verified to belong to profile.company_id above — so this
  //    filter cannot leak decisions from another company's candidate.
  //    The authenticated client also applies the decisions RLS policy as a second guard.
  const { data: decisions, error: decisionsError } = await supabase
    .from("decisions")
    .select("id, decision, decided_at, notes")
    .eq("candidate_id", candidate.id)
    .order("decided_at", { ascending: false });

  if (decisionsError) {
    console.error("Decision history fetch error:", decisionsError);
  }

  // 6. Fetch collaboration entries for this candidate, oldest first.
  //    Ordered ASC — the feed is a chronological thread read top-to-bottom.
  //    candidate.id was verified to belong to profile.company_id in step 3,
  //    so this query cannot leak entries from another company's candidate.
  //    author:profiles!author_profile_id joins the author name inline (nullable).
  const { data: collaborationEntries, error: collaborationError } = await supabase
    .from("candidate_collaboration_entries")
    .select(
      "id, entry_type, body, visibility, author_profile_id, created_at, author:profiles!author_profile_id(full_name, email)"
    )
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: true });

  if (collaborationError) {
    console.error("Collaboration entries fetch error:", collaborationError);
  }

  const entries = (collaborationEntries ?? []) as unknown as CollabEntryRow[];

  // 7. Fetch company profiles for the owner assignment dropdown.
  //    Scoped to profile.company_id resolved in step 2 — never from client.
  const { data: companyProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("company_id", profile.company_id)
    .order("full_name", { ascending: true });

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600"
      >
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{candidate.full_name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{candidate.email}</p>
        </div>
        <CandidateStatusBadge status={candidate.status as CandidateStatus} />
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        <Row label="Role" value={role?.title ?? "—"} />
        <Row label="Department" value={role?.department ?? "—"} />
        <Row
          label="Submitted"
          value={new Date(candidate.submitted_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
        {candidate.linkedin_url && (
          <Row
            label="LinkedIn"
            value={
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {candidate.linkedin_url}
              </a>
            }
          />
        )}
        {candidate.resume_url && (
          <Row label="Resume" value={<span className="text-zinc-500">Resume on file</span>} />
        )}
      </div>

      {/* Decision */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700">Make a decision</p>
        {decision === "saved" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Decision saved.
          </div>
        )}
        <DecisionForm candidateId={candidate.id} currentStatus={candidate.status} />
      </div>

      {/* Decision history */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700">Decision history</p>
        {decisionsError ? (
          <p className="text-sm text-zinc-400">Failed to load decision history.</p>
        ) : !decisions || decisions.length === 0 ? (
          <p className="text-sm text-zinc-400">No decisions recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {decisions.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-zinc-900">
                    {DECISION_LABELS[d.decision as keyof typeof DECISION_LABELS]}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatEventDate(d.decided_at)}
                  </span>
                </div>
                {d.notes && (
                  <p className="mt-1 text-zinc-500 whitespace-pre-wrap">{d.notes}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Team collaboration — visually separated from decision history */}
      <div className="space-y-4 border-t border-zinc-200 pt-4">
        <p className="text-sm font-medium text-zinc-700">Team collaboration</p>

        {collab === "owner-updated" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Owner updated.
          </div>
        )}
        {collab === "entry-saved" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Entry added to feed.
          </div>
        )}

        {/* Owner */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Owner</p>
          <p className="text-sm text-zinc-700">
            {owner?.full_name ?? owner?.email ?? "Unassigned"}
          </p>
          <AssignOwnerForm
            candidateId={candidate.id}
            currentOwnerId={candidate.owner_profile_id}
            profiles={companyProfiles ?? []}
          />
        </div>

        {/* Collaboration composer */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Add to feed</p>
          <CollaborationEntryForm candidateId={candidate.id} />
        </div>

        {/* Collaboration feed */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Feed</p>
          {collaborationError ? (
            <p className="text-sm text-zinc-400">Failed to load collaboration feed.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-zinc-400">No entries yet.</p>
          ) : (
            <ol className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      label={ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type}
                      colorClass={ENTRY_TYPE_COLORS[entry.entry_type] ?? "bg-zinc-100 text-zinc-600"}
                    />
                    <Badge
                      label={VISIBILITY_LABELS[entry.visibility] ?? entry.visibility}
                      colorClass={VISIBILITY_COLORS[entry.visibility] ?? "bg-zinc-100 text-zinc-500"}
                    />
                    <span className="ml-auto shrink-0 text-xs text-zinc-400">
                      {formatEventDate(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-zinc-800 whitespace-pre-wrap">{entry.body}</p>
                  <p className="text-xs text-zinc-400">
                    {entry.author?.full_name ?? entry.author?.email ?? "Unknown user"}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-3.5">
      <span className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-400 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-zinc-800">{value}</span>
    </div>
  );
}

// Formats a timestamp for event log entries (decisions, collaboration feed).
// Includes date + time so entries on the same day can be distinguished.
function formatEventDate(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Inline badge used for collaboration feed entry type and visibility labels.
function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
