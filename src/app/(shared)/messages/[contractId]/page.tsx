import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ContractBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ContractChat, type ChatPerson } from "@/components/contracts/contract-chat";
import { contractAccess, displayName, people } from "@/components/contracts/data";
import type { Message } from "@/lib/types";
import { markThreadRead, sendMessage } from "../actions";

export const metadata = { title: "Chat" };

export default async function ThreadPage({ params }: PageProps<"/messages/[contractId]">) {
  const viewer = await requireOnboarded();
  const { contractId } = await params;
  const access = await contractAccess(viewer, contractId);
  if (!access) notFound();
  const { contract: c, role, otherId } = access;

  const db = createServiceClient();
  const { data } = await db.from("messages").select("*").eq("contract_id", c.id).order("created_at", { ascending: false }).limit(500);
  const messages = ((data ?? []) as Message[]).reverse();
  const who = await people([c.client_id, c.designer_id, ...messages.map((m) => m.sender_id)]);
  const other = who.get(otherId);
  const chatPeople: Record<string, ChatPerson> = Object.fromEntries([...who.values()].map((p) => [p.id, { name: p.name, avatar: p.avatar }]));

  return (
    <>
      <Link href="/messages" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={14} /> All messages
      </Link>
      <Card className="flex h-[calc(100dvh-12rem)] min-h-[480px] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-paper-200 px-5 py-3">
          <Avatar name={other?.name} src={other?.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{role === "admin" ? `${who.get(c.client_id)?.name} and ${who.get(c.designer_id)?.name}` : displayName(other)}</div>
            <div className="truncate text-xs text-ink-500">
              <span className="font-mono">{c.code}</span> · {c.title}
            </div>
          </div>
          <ContractBadge status={c.status} />
          <LinkButton href={`/contracts/${c.id}`} variant="secondary" size="sm">Open contract</LinkButton>
        </div>
        <ContractChat
          className="flex-1"
          contractId={c.id}
          viewerId={viewer.id}
          initialMessages={messages}
          people={chatPeople}
          readOnly={role === "admin"}
          markRead={markThreadRead}
          sendFallback={sendMessage}
        />
      </Card>
    </>
  );
}
