"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatTime } from "@/components/contracts/util";
import type { Message } from "@/lib/types";

export type ChatPerson = { name: string; avatar: string | null };

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Live chat for one contract. Messages arrive via Supabase Realtime. */
export function ContractChat({
  contractId,
  viewerId,
  initialMessages,
  people,
  readOnly = false,
  markRead,
  sendFallback,
  className,
}: {
  contractId: string;
  viewerId: string;
  initialMessages: Message[];
  people: Record<string, ChatPerson>;
  readOnly?: boolean;
  markRead?: (contractId: string) => Promise<void>;
  sendFallback?: (contractId: string, body: string) => Promise<{ error?: string; message?: Message }>;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Live updates.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${contractId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `contract_id=eq.${contractId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!readOnly && m.sender_id !== viewerId && markRead) void markRead(contractId);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `contract_id=eq.${contractId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, contractId, viewerId, readOnly, markRead]);

  // Opening the thread marks the other party's messages as read.
  useEffect(() => {
    if (!readOnly && markRead) void markRead(contractId);
  }, [contractId, readOnly, markRead]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ contract_id: contractId, sender_id: viewerId, body })
      .select()
      .single<Message>();
    let sent = data;
    if (insertError && sendFallback) {
      const res = await sendFallback(contractId, body);
      if (res.error) setError(res.error);
      sent = res.message ?? null;
    } else if (insertError) {
      setError("Your message didn't send. Please try again.");
    }
    if (sent) {
      const m = sent;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setDraft("");
    }
    setSending(false);
  }

  const days = messages.map((m) => dayLabel(m.created_at));
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-ink-500">
            No messages yet. Say hello and agree on how you&apos;ll share drafts. Updates about funding and approvals will appear here too.
          </p>
        )}
        {messages.map((m, i) => {
          const day = days[i];
          const divider = i === 0 || day !== days[i - 1];
          const mine = m.sender_id === viewerId;
          const who = people[m.sender_id];
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {divider && <div className="text-center text-[11px] font-medium uppercase tracking-wide text-ink-400">{day}</div>}
              {m.is_system ? (
                <div className="mx-auto flex max-w-[90%] items-start gap-2 rounded-md bg-paper-100 px-3 py-2 text-xs text-ink-600">
                  <Info size={13} className="mt-0.5 shrink-0 text-ink-400" />
                  <span>
                    {m.body}
                    <span className="ml-2 text-ink-400">{formatTime(m.created_at)}</span>
                  </span>
                </div>
              ) : (
                <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
                  {!mine && <Avatar name={who?.name} src={who?.avatar} size={28} />}
                  <div className={cn("max-w-[78%]", mine && "text-right")}>
                    <div
                      className={cn(
                        "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm",
                        mine ? "rounded-br-sm bg-ink-900 text-paper-50" : "rounded-bl-sm border border-paper-200 bg-paper-0 text-ink-900",
                      )}
                    >
                      {m.body}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-400">
                      {!mine && who ? `${who.name} · ` : ""}
                      {formatTime(m.created_at)}
                      {mine && m.read_at ? " · Seen" : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {readOnly ? (
        <p className="border-t border-paper-200 px-5 py-3 text-xs text-ink-500">You&apos;re viewing this chat as an admin. Only the client and designer can send messages.</p>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-2 border-t border-paper-200 p-3">
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder="Write a message…"
              aria-label="Message"
              className="max-h-40 min-h-10 flex-1 resize-none rounded-md border border-paper-200 bg-paper-0 px-3 py-2.5 text-sm placeholder:text-ink-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <Button type="submit" disabled={sending || !draft.trim()} aria-label="Send message">
              <Send size={14} />
              Send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
