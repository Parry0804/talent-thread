import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { NAV } from "@/components/shell/nav";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { ReactNode } from "react";

const roleLabel = { designer: "Designer", client: "Client", admin: "Admin" } as const;

/** Signed-in layout: role sidebar (desktop), top bar with notifications. */
export async function AppShell({ viewer, children, aside }: { viewer: Profile; children: ReactNode; aside?: ReactNode }) {
  const supabase = await createClient();
  const [{ count: unread }, { count: unreadMsgs }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).eq("read", false),
    supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", viewer.id).is("read_at", null),
  ]);
  const home = viewer.role === "admin" ? "/admin" : viewer.role === "client" ? "/client" : "/designer";

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-paper-200 bg-paper-0 px-4 py-5 lg:flex">
        <div className="mb-6 px-2">
          <Logo href={home} />
        </div>
        <SidebarNav items={NAV[viewer.role]} badges={unreadMsgs ? { "/messages": unreadMsgs } : undefined} />
        <div className="mt-auto flex flex-col gap-3">
          {aside}
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar name={viewer.full_name} src={viewer.avatar_url} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{viewer.full_name || "You"}</div>
              <div className="text-xs text-ink-500">{roleLabel[viewer.role]}</div>
            </div>
            <form action={signOut}>
              <button className="rounded-md p-1.5 text-ink-500 hover:bg-paper-100 hover:text-ink-900" aria-label="Sign out" title="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-paper-200 bg-paper-50/90 px-4 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Logo href={home} />
          </div>
          <div className="flex-1" />
          <Link href="/notifications" className="relative rounded-full p-2 text-ink-600 hover:bg-paper-100" aria-label="Notifications">
            <Bell size={18} />
            {unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-marigold-500" /> : null}
          </Link>
          <details className="relative lg:hidden">
            <summary className="list-none cursor-pointer rounded-full"><Avatar name={viewer.full_name} size={32} /></summary>
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-paper-200 bg-paper-0 p-2 shadow-overlay">
              <SidebarNav items={NAV[viewer.role]} />
              <form action={signOut} className="mt-2 border-t border-paper-200 pt-2">
                <button className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-600 hover:bg-paper-100">Sign out</button>
              </form>
            </div>
          </details>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
