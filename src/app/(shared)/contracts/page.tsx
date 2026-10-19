import Link from "next/link";
import { FileText } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ContractBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { people } from "@/components/contracts/data";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Contract, ContractStatus } from "@/lib/types";

export const metadata = { title: "Contracts" };

const TABS = {
  active: { label: "Active", statuses: ["active", "disputed"] as ContractStatus[] },
  offers: { label: "Offers", statuses: ["pending"] as ContractStatus[] },
  completed: { label: "Completed", statuses: ["completed", "cancelled"] as ContractStatus[] },
} as const;
type Tab = keyof typeof TABS;

export default async function ContractsPage({ searchParams }: PageProps<"/contracts">) {
  const viewer = await requireOnboarded();
  const sp = await searchParams;
  const tab: Tab = (["active", "offers", "completed"] as const).find((t) => t === sp.tab) ?? "active";

  const db = createServiceClient();
  let query = db.from("contracts").select("*").order("created_at", { ascending: false }).limit(200);
  if (viewer.role !== "admin") query = query.or(`client_id.eq.${viewer.id},designer_id.eq.${viewer.id}`);
  const { data } = await query;
  const all = (data ?? []) as Contract[];
  const counts = Object.fromEntries(
    (Object.keys(TABS) as Tab[]).map((t) => [t, all.filter((c) => TABS[t].statuses.includes(c.status)).length]),
  ) as Record<Tab, number>;
  const list = all.filter((c) => TABS[tab].statuses.includes(c.status));

  const ids = list.map((c) => c.id);
  const { data: ms } = ids.length
    ? await db.from("milestones").select("contract_id, amount, status").in("contract_id", ids)
    : { data: [] as { contract_id: string; amount: number; status: string }[] };
  const released = new Map<string, number>();
  for (const m of ms ?? []) if (m.status === "released") released.set(m.contract_id, (released.get(m.contract_id) ?? 0) + m.amount);
  const who = await people(list.flatMap((c) => [c.client_id, c.designer_id]));

  const isClient = viewer.role === "client";
  const emptyCopy: Record<Tab, { title: string; body: string }> = {
    active: {
      title: "No active contracts yet",
      body: isClient
        ? "When a designer accepts your offer, the contract and its milestones show up here. Send an offer from one of your job's applicants to get started."
        : "Contracts you've accepted appear here with their milestones and payments. Apply to jobs to get your first offer.",
    },
    offers: {
      title: "No open offers",
      body: isClient
        ? "Offers you send to designers wait here until they accept or decline."
        : "When a client sends you an offer, it lands here for you to accept or decline.",
    },
    completed: {
      title: "Nothing completed yet",
      body: "Once every milestone on a contract is paid out, it moves here so you can leave a review.",
    },
  };

  return (
    <>
      <PageHeader
        title="Contracts"
        sub={viewer.role === "admin" ? "Every contract on Talent Thread." : "Your offers, work in progress and finished projects. Money for each milestone is held in escrow until it's approved."}
      />
      <div className="mb-6 flex gap-1 rounded-full border border-paper-200 bg-paper-0 p-1 text-sm sm:w-fit">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={`/contracts?tab=${t}`}
            className={cn(
              "flex-1 rounded-full px-4 py-1.5 text-center font-medium sm:flex-none",
              t === tab ? "bg-ink-900 text-paper-50" : "text-ink-600 hover:bg-paper-100",
            )}
          >
            {TABS[t].label}
            <span className={cn("ml-1.5 text-xs", t === tab ? "text-paper-200" : "text-ink-400")}>{counts[t]}</span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title={emptyCopy[tab].title}
          body={emptyCopy[tab].body}
          action={
            viewer.role === "client" ? (
              <LinkButton href="/client/jobs">Go to my jobs</LinkButton>
            ) : viewer.role === "designer" ? (
              <LinkButton href="/designer/jobs">Find work</LinkButton>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((c) => {
            const otherId = viewer.id === c.client_id ? c.designer_id : c.client_id;
            const other = viewer.role === "admin" ? undefined : who.get(otherId);
            const rel = released.get(c.id) ?? 0;
            const pct = c.total_amount ? Math.round((rel / c.total_amount) * 100) : 0;
            return (
              <Link key={c.id} href={`/contracts/${c.id}`}>
                <Card className="grid gap-4 p-5 transition-colors hover:border-ink-300 md:grid-cols-[minmax(0,1fr)_200px_220px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-ink-900">{c.title}</h2>
                      <ContractBadge status={c.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                      <span className="font-mono text-xs">{c.code}</span>
                      <span>Started {formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {other ? (
                      <>
                        <Avatar name={other.name} src={other.avatar} size={28} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{other.name}</div>
                          <div className="truncate text-xs text-ink-500">{other.company ?? (viewer.role === "client" ? "Designer" : "Client")}</div>
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0 text-xs text-ink-500">
                        <div className="truncate">Client: {who.get(c.client_id)?.name ?? "—"}</div>
                        <div className="truncate">Designer: {who.get(c.designer_id)?.name ?? "—"}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold tabular">{formatINR(c.total_amount)}</span>
                      <span className="text-xs text-ink-500 tabular">{formatINR(rel)} released</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-100">
                      <div className="h-full rounded-full bg-marigold-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
