import Link from "next/link";
import { AlertTriangle, Flag, Sparkles, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { people } from "@/components/contracts/data";
import { ESCROW_STATES } from "@/components/contracts/util";
import { formatINR } from "@/lib/money";
import { timeAgo } from "@/lib/format";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

export const metadata = { title: "Admin overview" };

const sum = <T,>(rows: T[] | null | undefined, f: (r: T) => number) => (rows ?? []).reduce((a, r) => a + (f(r) || 0), 0);

export default async function AdminOverview() {
  await requireRole("admin");
  const db = createServiceClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekAgo = daysAgo(7);
  const count = (table: string) => db.from(table).select("id", { count: "exact", head: true });

  const [designers, clients, admins, jobsOpen, contractsActive, disputesOpen, escrow, released, fees, commission, aiWeek, disputes, flaggedRaw, payouts] =
    await Promise.all([
      count("profiles").eq("role", "designer"),
      count("profiles").eq("role", "client"),
      count("profiles").eq("role", "admin"),
      count("jobs").eq("status", "open"),
      count("contracts").eq("status", "active"),
      count("disputes").eq("status", "open"),
      db.from("milestones").select("amount").in("status", [...ESCROW_STATES]),
      db.from("milestones").select("amount").eq("status", "released").gte("released_at", monthStart.toISOString()),
      db.from("payments").select("platform_fee").in("status", ["paid", "refunded"]),
      db.from("payouts").select("commission"),
      db.from("ai_reviews").select("overall").eq("status", "done").gte("created_at", weekAgo.toISOString()),
      db.from("disputes").select("id, reason, created_at, contract_id, contracts(code, title)").eq("status", "open").order("created_at").limit(6),
      db
        .from("ai_reviews")
        .select("id, designer_id, overall, band, created_at, flags:report->flags")
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(200),
      db.from("payouts").select("id, net, created_at, designer_id").eq("status", "pending").order("created_at").limit(6),
    ]);

  const ai = aiWeek.data ?? [];
  const avg = ai.length ? Math.round(sum(ai, (r) => r.overall ?? 0) / ai.length) : null;
  const flagged = ((flaggedRaw.data ?? []) as { id: string; designer_id: string; overall: number | null; band: string | null; created_at: string; flags: string[] | null }[])
    .filter((r) => Array.isArray(r.flags) && r.flags.length > 0)
    .slice(0, 6);
  const { count: pendingPayoutCount } = await db.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending");
  const who = await people([...flagged.map((f) => f.designer_id), ...(payouts.data ?? []).map((p) => p.designer_id)]);
  const revenue = sum(fees.data, (r) => r.platform_fee) + sum(commission.data, (r) => r.commission);
  const disputeRows = (disputes.data ?? []) as unknown as { id: string; reason: string; created_at: string; contracts: { code: string; title: string } | null }[];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" sub="The health of the marketplace, and what needs a human today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Users"
          value={(designers.count ?? 0) + (clients.count ?? 0) + (admins.count ?? 0)}
          sub={`${designers.count ?? 0} designers · ${clients.count ?? 0} clients · ${admins.count ?? 0} admins`}
        />
        <Stat label="Jobs open" value={jobsOpen.count ?? 0} sub="Published and taking applications" />
        <Stat label="Contracts active" value={contractsActive.count ?? 0} sub="Accepted, work in progress" />
        <Stat label="Open disputes" value={disputesOpen.count ?? 0} sub="Money frozen in escrow" />
        <Stat label="GMV in escrow" value={formatINR(sum(escrow.data, (r) => r.amount))} sub="Funded, not yet released" />
        <Stat label="Released this month" value={<span className="text-marigold-800">{formatINR(sum(released.data, (r) => r.amount))}</span>} sub="Milestones approved since the 1st" />
        <Stat label="Platform revenue" value={formatINR(revenue)} sub="Client fees + designer commission, all time (excl. GST)" />
        <Stat
          label="AI reviews this week"
          value={ai.length}
          sub={avg != null ? `Average score ${avg}/100` : "No completed reviews in the last 7 days"}
          icon={<Sparkles size={16} className="text-violet-500" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-danger-600" /> Disputes to resolve</span>} action={<Link href="/admin/disputes" className="text-sm text-ink-500 hover:text-ink-900">All</Link>} />
          <CardBody className="flex flex-col gap-2">
            {disputeRows.length === 0 ? (
              <p className="text-sm text-ink-500">No open disputes. New ones appear here the moment someone raises one.</p>
            ) : (
              disputeRows.map((d) => (
                <Link key={d.id} href={`/admin/disputes/${d.id}`} className="rounded-md border border-paper-200 px-3 py-2.5 hover:border-ink-300">
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span className="truncate">{d.contracts?.title ?? "Contract"}</span>
                    <span className="font-mono text-xs text-ink-400">{d.contracts?.code}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">{d.reason} · {timeAgo(d.created_at)}</div>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Flag size={16} className="text-violet-500" /> Flagged AI reviews</span>} action={<Link href="/admin/ai?f=flagged" className="text-sm text-ink-500 hover:text-ink-900">All</Link>} />
          <CardBody className="flex flex-col gap-2">
            {flagged.length === 0 ? (
              <p className="text-sm text-ink-500">Nothing flagged. The AI flags work that may be copied, AI-generated or off-discipline.</p>
            ) : (
              flagged.map((r) => (
                <Link key={r.id} href={`/admin/ai/${r.id}`} className="rounded-md border border-paper-200 px-3 py-2.5 hover:border-ink-300">
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span className="truncate">{who.get(r.designer_id)?.name ?? "Designer"}</span>
                    <span className="tabular">{r.overall ?? "–"}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-500">{r.flags?.[0]}</div>
                </Link>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Wallet size={16} className="text-marigold-600" /> Payouts pending</span>}
            action={<Link href="/admin/payments" className="text-sm text-ink-500 hover:text-ink-900">All</Link>}
            sub={pendingPayoutCount ? `${pendingPayoutCount} waiting to be paid by hand` : undefined}
          />
          <CardBody className="flex flex-col gap-2">
            {(payouts.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-500">No payouts waiting. Approved milestones create a payout here for you to pay.</p>
            ) : (
              (payouts.data ?? []).map((p) => (
                <Link key={p.id} href="/admin/payments" className="flex items-center justify-between rounded-md border border-paper-200 px-3 py-2.5 text-sm hover:border-ink-300">
                  <span className="truncate font-medium">{who.get(p.designer_id)?.name ?? "Designer"}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone="warning">{timeAgo(p.created_at)}</Badge>
                    <span className="font-semibold tabular">{formatINR(p.net)}</span>
                  </span>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
