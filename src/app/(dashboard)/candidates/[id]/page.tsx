import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CandidateStatusBadge } from "@/components/candidates/CandidateStatusBadge";
import type { CandidateStatus } from "@/types";
import { DECISION_LABELS } from "@/types";
import { DecisionForm } from "./DecisionForm";

interface CandidateDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ decision?: string }>;
}

export default async function CandidateDetailPage({ params, searchParams }: CandidateDetailPageProps) {
  const { id } = await params;
  const { decision } = await searchParams;

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
      roles(title, department)
    `
    )
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (candidateError) {
    console.error("Candidate detail fetch error:", candidateError);
  }

  // 4. If no row is returned — either the candidate doesn't exist or belongs to
  //    a different company — render 404. Do not distinguish the two cases.
  if (!candidate) notFound();

  // Supabase infers roles as an array for FK relations; cast to the runtime shape.
  const role = candidate.roles as unknown as { title: string; department: string | null } | null;

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
        <DecisionForm candidateId={candidate.id} />
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
                    {new Date(d.decided_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
