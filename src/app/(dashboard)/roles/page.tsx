import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "@/components/roles/CopyLinkButton";
import type { RoleStatus } from "@/types";

const STATUS_LABELS: Record<RoleStatus, string> = {
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

const STATUS_COLORS: Record<RoleStatus, string> = {
  open: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  closed: "bg-zinc-100 text-zinc-500",
};

export default async function RolesPage() {
  // Derive the app origin from the incoming request so the submission link is
  // correct in every environment without relying on an env var fallback.
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  // 1. Resolve authenticated user server-side.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Resolve company_id from the authenticated user's profile.
  //    Never comes from the client.
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

  // 3. Fetch roles scoped to this company only.
  //    Explicit .eq("company_id", ...) enforces tenant scoping at the query level
  //    in addition to RLS policies.
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, title, department, status, submission_token, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (rolesError) {
    console.error("Roles page fetch error:", rolesError);
    return (
      <div className="p-8 text-sm text-zinc-500">
        Failed to load roles. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Roles</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {roles.length} role{roles.length !== 1 ? "s" : ""}
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
          No roles yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Submission link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {roles.map((role) => {
                const submissionUrl = `${origin}/submit/${role.submission_token}`;
                return (
                  <tr key={role.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{role.title}</p>
                      {role.department && (
                        <p className="text-zinc-400">{role.department}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[role.status as RoleStatus]}`}
                      >
                        {STATUS_LABELS[role.status as RoleStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(role.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="truncate max-w-48 text-xs text-zinc-400 font-mono">
                          {submissionUrl}
                        </span>
                        <CopyLinkButton url={submissionUrl} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
