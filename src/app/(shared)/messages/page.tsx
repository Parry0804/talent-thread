import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ContractBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { people } from "@/components/contracts/data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Contract, Message } from "@/lib/types";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const viewer = await requireOnboarded();
  if (viewer.role === "admin") {
    return (
      <>
        <PageHeader title="Messages" sub="Admins don't take part in contract chats." />
        <EmptyState
          icon={<MessageSquare size={28} />}
          title="Read chats from a contract"
          body="Open any contract from the admin panel to read its chat history. Chats are read-only for admins."
          action={<LinkButton href="/admin/contracts">Go to contracts</LinkButton>}
        />
      </>
    );
  }

  const db = createServiceClient();
  const { data: cData } = await db
    .from("contracts")
    .select("*")
    .or(`client_id.eq.${viewer.id},designer_id.eq.${viewer.id}`)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(100);
  const contracts = (cData ?? []) as Contract[];
  const ids = contracts.map((c) => c.id);

  const { data: mData } = ids.length
    ? await db.from("messages").select("*").in("contract_id", ids).order("created_at", { ascending: false }).limit(1000)
    : { data: [] };
  const last = new Map<string, Message>();
  const unread = new Map<string, number>();
  for (const m of (mData ?? []) as Message[]) {
    if (!last.has(m.contract_id)) last.set(m.contract_id, m);
    if (m.sender_id !== viewer.id && !m.read_at) unread.set(m.contract_id, (unread.get(m.contract_id) ?? 0) + 1);
  }
  const who = await people(contracts.map((c) => (c.client_id === viewer.id ? c.designer_id : c.client_id)));
  const threads = [...contracts].sort(
    (a, b) => new Date(last.get(b.id)?.created_at ?? b.created_at).getTime() - new Date(last.get(a.id)?.created_at ?? a.created_at).getTime(),
  );

  return (
    <>
      <PageHeader title="Messages" sub="One thread per contract. Funding, submissions and approvals are posted here automatically." />
      {threads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={28} />}
          title="No conversations yet"
          body={
            viewer.role === "client"
              ? "Each contract gets its own chat. Send an offer to a designer and you can message them here."
              : "Each contract gets its own chat. Once a client sends you an offer, you can message them here."
          }
          action={<LinkButton href={viewer.role === "client" ? "/client/jobs" : "/designer/jobs"}>{viewer.role === "client" ? "Go to my jobs" : "Find work"}</LinkButton>}
        />
      ) : (
        <Card className="divide-y divide-paper-200 overflow-hidden">
          {threads.map((c) => {
            const other = who.get(c.client_id === viewer.id ? c.designer_id : c.client_id);
            const m = last.get(c.id);
            const n = unread.get(c.id) ?? 0;
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper-50">
                <Avatar name={other?.name} src={other?.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("truncate text-sm", n ? "font-semibold text-ink-900" : "font-medium text-ink-800")}>{other?.name ?? "Unknown"}</span>
                    <span className="truncate text-xs text-ink-400">{c.title}</span>
                  </div>
                  <p className={cn("mt-0.5 truncate text-sm", n ? "text-ink-800" : "text-ink-500")}>
                    {m ? `${m.sender_id === viewer.id && !m.is_system ? "You: " : ""}${m.body}` : "No messages yet. Say hello."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-xs text-ink-400">{timeAgo(m?.created_at ?? c.created_at)}</span>
                  {n > 0 ? (
                    <span className="rounded-full bg-marigold-500 px-2 text-[11px] font-semibold text-ink-900">{n}</span>
                  ) : (
                    <ContractBadge status={c.status} />
                  )}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
