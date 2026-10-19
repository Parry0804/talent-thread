import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { ContractBadge } from "@/components/ui/badge";
import { EmptyRow, FilterTabs, Pager, Table, Td } from "@/components/admin/table";
import { people, displayName } from "@/components/contracts/data";
import { contractFigures } from "@/components/contracts/util";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Contract } from "@/lib/types";

export const metadata = { title: "Contracts" };
const PAGE = 50;
const STATUSES = ["all", "pending", "active", "disputed", "completed", "cancelled"];

export default async function AdminContractsPage({ searchParams }: PageProps<"/admin/contracts">) {
  await requireRole("admin");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createServiceClient();
  let query = db.from("contracts").select("*").order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as Contract[];
  const list = rows.slice(0, PAGE);
  const ids = list.map((c) => c.id);
  const { data: ms } = ids.length ? await db.from("milestones").select("contract_id, amount, status").in("contract_id", ids) : { data: [] };
  const byContract = new Map<string, { amount: number; status: string }[]>();
  for (const m of ms ?? []) byContract.set(m.contract_id, [...(byContract.get(m.contract_id) ?? []), m]);
  const who = await people(list.flatMap((c) => [c.client_id, c.designer_id]));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Contracts" sub="Every contract and where its money is. Open one to see milestones, files and the chat." />
      <div className="mb-5">
        <FilterTabs
          active={status}
          items={STATUSES.map((s) => ({ key: s, label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1), href: `/admin/contracts?status=${s}` }))}
        />
      </div>
      <Table head={["Contract", "Client", "Designer", "Value", "In escrow", "Released", "Status", "Started"]}>
        {list.length === 0 ? (
          <EmptyRow cols={8}>No contracts yet. They appear when a client sends an offer.</EmptyRow>
        ) : (
          list.map((c) => {
            const f = contractFigures(byContract.get(c.id) ?? []);
            return (
              <tr key={c.id}>
                <Td>
                  <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                  <div className="font-mono text-xs text-ink-400">{c.code}</div>
                </Td>
                <Td className="text-ink-600">{displayName(who.get(c.client_id))}</Td>
                <Td className="text-ink-600">{who.get(c.designer_id)?.name}</Td>
                <Td className="tabular">{formatINR(c.total_amount)}</Td>
                <Td className="tabular">{formatINR(f.escrow)}</Td>
                <Td className="tabular">{formatINR(f.released)}</Td>
                <Td><ContractBadge status={c.status} /></Td>
                <Td className="whitespace-nowrap text-ink-500">{formatDate(c.created_at)}</Td>
              </tr>
            );
          })
        )}
      </Table>
      <Pager page={page} hasNext={rows.length > PAGE} base={`/admin/contracts?status=${status}`} />
    </>
  );
}
