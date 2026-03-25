import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleCard } from "@/components/roles/RoleCard";
import type { RoleWithCandidateCount } from "@/types";
import { type CandidateListItem } from "@/components/candidates/CandidateList";
import { CandidateListWithFilters } from "@/components/candidates/CandidateListWithFilters";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ role_id?: string }>;
}) {
  const { role_id: roleId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get the hiring manager's profile to get their company_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.company_id) {
    return (
      <div className="p-8 text-sm text-zinc-500">
        No profile found. Contact your administrator.
      </div>
    );
  }

  // Fetch open roles with candidate counts for this company
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select(
      `
      id,
      company_id,
      title,
      department,
      status,
      submission_token,
      created_by,
      created_at,
      candidates(id, status)
    `
    )
    .eq("company_id", profile.company_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (rolesError) {
    console.error("Dashboard roles fetch error:", rolesError)
    return (
      <div className="p-8 text-sm text-zinc-500">
        Failed to load roles. Please refresh the page.
      </div>
    )
  }

  // Fetch recent candidates for this company only.
  // company_id is resolved from the authenticated user's own profile above — never from the client.
  // The explicit .eq("company_id", ...) enforces tenant scoping at the query level,
  // in addition to whatever RLS policies are active.
  const { data: recentCandidates, error: candidatesError } = await supabase
    .from("candidates")
    .select("id, role_id, full_name, email, status, submitted_at, roles(title, department)")
    .eq("company_id", profile.company_id)
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (candidatesError) {
    console.error("Dashboard candidates fetch error:", candidatesError)
  }

  // Supabase infers the nested roles relation as an array type but returns an object
  // at runtime for a many-to-one FK. Cast to the shape we know it produces.
  const candidates = (recentCandidates ?? []) as unknown as CandidateListItem[]

  const rolesWithCounts: RoleWithCandidateCount[] = (roles ?? []).map((role) => {
    const candidates = role.candidates as { id: string; status: string }[];
    return {
      id: role.id,
      company_id: role.company_id,
      title: role.title,
      department: role.department,
      status: role.status,
      submission_token: role.submission_token,
      created_by: role.created_by,
      created_at: role.created_at,
      candidate_count: candidates.length,
      pending_count: candidates.filter((c) => c.status === "pending").length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Open Roles</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {rolesWithCounts.length} open role{rolesWithCounts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {rolesWithCounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
          No open roles yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rolesWithCounts.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {/* Recent candidates — read-only list, scoped to this company */}
      <div className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Recent Candidates</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} (most recent 20)
          </p>
        </div>

        <CandidateListWithFilters candidates={candidates} roleId={roleId} />
      </div>
    </div>
  );
}
