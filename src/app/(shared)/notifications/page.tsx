import { Bell, ChevronRight } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/types";
import { markAllRead, openNotification } from "./actions";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await requireOnboarded();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const list = (data ?? []) as Notification[];
  const unread = list.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        sub={unread ? `You have ${unread} unread update${unread === 1 ? "" : "s"}.` : "You're all caught up."}
        action={
          unread > 0 ? (
            <form action={markAllRead}>
              <SubmitButton variant="secondary" pending="Marking…">Mark all as read</SubmitButton>
            </form>
          ) : null
        }
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title="No notifications yet"
          body="Offers, payments, submitted work, AI review results and disputes will show up here as they happen."
        />
      ) : (
        <Card className="divide-y divide-paper-200 overflow-hidden">
          {list.map((n) => (
            <form key={n.id} action={openNotification}>
              <input type="hidden" name="id" value={n.id} />
              <button className={cn("flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-paper-50", !n.read && "bg-marigold-50/50")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-marigold-500")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", n.read ? "text-ink-700" : "font-semibold text-ink-900")}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-sm text-ink-500">{n.body}</span>}
                  <span className="mt-1 block text-xs text-ink-400">{timeAgo(n.created_at)}</span>
                </span>
                {n.link && <ChevronRight size={16} className="mt-1 shrink-0 text-ink-400" />}
                <span className="sr-only">{n.read ? "" : "Unread. "}Open</span>
              </button>
            </form>
          ))}
        </Card>
      )}
    </>
  );
}
