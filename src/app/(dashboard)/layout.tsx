import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white px-4 py-6 flex flex-col">
        <div className="mb-8">
          <span className="text-sm font-semibold text-zinc-900 tracking-tight">
            HireRelay
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/roles"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            Roles
          </Link>
        </nav>

        <div className="border-t border-zinc-100 pt-4">
          <p className="truncate text-xs text-zinc-400">{user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
