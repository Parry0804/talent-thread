import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyRow, FilterTabs, Table, Td } from "@/components/admin/table";
import { people } from "@/components/contracts/data";
import { formatINR } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/format";

export const metadata = { title: "Disputes" };

export default async function AdminDisputesPage({ searchParams }: PageProps<"/admin/disputes">) {
  await requireRole("admin");
  const sp = await searchParams;
  const status = sp.status === "resolved" ? "resolved" : sp.status === "all" ? "all" : "open";
  const db = createServiceClient();
  let query = db
    .from("disputes")
    .select("*, contracts(code, title, client_id, designer_id), milestones(seq, title, amount)")
    .order("created_at", { ascending: status === "open" })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  type Row = {
    id: string; reason: string; status: string; resolution: string | null; designer_share_pct: number | null; raised_by: string; created_at: string; resolved_at: string | null;
    contracts: { code: string; title: string; client_id: string; designer_id: string } | null;
    milestones: { seq: number; title: string; amount: number } | null;
  };
  const rows = (data ?? []) as Row[];
  const who = await people(rows.map((r) => r.raised_by));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Disputes" sub="Money stays frozen in escrow until you decide. Aim to resolve each one within 2 working days." />
      <div className="mb-5">
        <FilterTabs
          active={status}
          items={[
            { key: "open", label: "Open", href: "/admin/disputes?status=open" },
            { key: "resolved", label: "Resolved", href: "/admin/disputes?status=resolved" },
            { key: "all", label: "All", href: "/admin/disputes?status=all" },
          ]}
        />
      </div>
      <Table head={["Contract", "Milestone", "Reason", "Raised by", "Opened", "Status", ""]}>
        {rows.length === 0 ? (
          <EmptyRow cols={7}>{status === "open" ? "No open disputes. Nice." : "No disputes here yet."}</EmptyRow>
        ) : (
          rows.map((d) => {
            const raiser = who.get(d.raised_by);
            const side = d.contracts?.client_id === d.raised_by ? "client" : "designer";
            return (
              <tr key={d.id}>
                <Td>
                  <div className="font-medium">{d.contracts?.title}</div>
                  <div className="font-mono text-xs text-ink-400">{d.contracts?.code}</div>
                </Td>
                <Td>
                  {d.milestones ? `M${d.milestones.seq}: ${d.milestones.title}` : "—"}
                  <div className="text-xs tabular text-ink-500">{formatINR(d.milestones?.amount)}</div>
                </Td>
                <Td>{d.reason}</Td>
                <Td>
                  {raiser?.name}
                  <div className="text-xs text-ink-500">{side}</div>
                </Td>
                <Td className="whitespace-nowrap text-ink-500">{timeAgo(d.created_at)}</Td>
                <Td>
                  {d.status === "open" ? (
                    <Badge tone="danger">Open</Badge>
                  ) : (
                    <>
                      <Badge tone="success">{d.resolution}{d.resolution === "split" ? ` ${d.designer_share_pct}%` : ""}</Badge>
                      <div className="mt-1 text-xs text-ink-400">{formatDate(d.resolved_at)}</div>
                    </>
                  )}
                </Td>
                <Td>
                  <Link href={`/admin/disputes/${d.id}`} className="text-sm font-medium hover:underline">{d.status === "open" ? "Review" : "View"}</Link>
                </Td>
              </tr>
            );
          })
        )}
      </Table>
    </>
  );
}
