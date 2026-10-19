import Link from "next/link";
import { Receipt } from "lucide-react";
import { requireClient } from "@/lib/client/data";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Payments" };

const statusMap: Record<string, [string, Tone]> = {
  created: ["Not completed", "neutral"],
  paid: ["Paid", "success"],
  failed: ["Failed", "danger"],
  refunded: ["Refunded", "info"],
};

interface PaymentRow {
  id: string; milestone_id: string; contract_id: string; amount: number; platform_fee: number; gst: number; total_paise: number;
  status: string; created_at: string; paid_at: string | null;
}

export default async function PaymentsPage() {
  const { viewer, company, supabase } = await requireClient();
  const { data } = await supabase.from("payments").select("*").eq("client_id", viewer.id).order("created_at", { ascending: false });
  const payments = (data ?? []) as PaymentRow[];
  const contractIds = [...new Set(payments.map((p) => p.contract_id))];
  const msIds = [...new Set(payments.map((p) => p.milestone_id))];
  const [{ data: cs }, { data: ms }] = await Promise.all([
    contractIds.length ? supabase.from("contracts").select("id, code, title").in("id", contractIds) : Promise.resolve({ data: [] }),
    msIds.length ? supabase.from("milestones").select("id, seq, title").in("id", msIds) : Promise.resolve({ data: [] }),
  ]);
  const contracts = new Map((cs ?? []).map((c) => [c.id as string, c as { code: string; title: string }]));
  const milestones = new Map((ms ?? []).map((m) => [m.id as string, m as { seq: number; title: string }]));

  const paid = payments.filter((p) => p.status === "paid" || p.status === "refunded");
  const totals = paid.reduce((s, p) => ({ amount: s.amount + p.amount, fee: s.fee + p.platform_fee, gst: s.gst + p.gst }), { amount: 0, fee: 0, gst: 0 });
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" sub="Every milestone you've funded, with the platform fee and GST shown separately." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Milestones funded" value={formatINR(totals.amount)} sub={refunded ? `${formatINR(refunded)} refunded` : "Paid into escrow for designers"} />
        <Stat label="Platform fees" value={formatINR(totals.fee)} sub="3% of each milestone" />
        <Stat label="GST paid" value={formatINR(totals.gst)} sub="18% on platform fees" />
        <Stat label="Total paid" value={formatINR(totals.amount + totals.fee + totals.gst)} />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="text-sm text-ink-500">GSTIN on your invoices</div>
          <div className="font-mono font-medium">{company.gstin || "Not added"}</div>
          {!company.gstin && <div className="text-xs text-ink-500">Add your GSTIN to claim input tax credit on the platform fee.</div>}
        </div>
        <Link href="/client/settings" className="text-sm font-medium text-violet-600 hover:underline">{company.gstin ? "Edit GSTIN" : "Add GSTIN"}</Link>
      </Card>

      {!payments.length ? (
        <EmptyState
          icon={<Receipt size={28} />}
          title="No payments yet"
          body="When you fund a milestone on a contract, the payment and its GST invoice appear here."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-paper-200 text-left text-xs text-ink-500">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Contract</th>
                <th className="px-3 py-3 font-medium">Milestone</th>
                <th className="px-3 py-3 text-right font-medium">Amount</th>
                <th className="px-3 py-3 text-right font-medium">Platform fee</th>
                <th className="px-3 py-3 text-right font-medium">GST</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200 tabular">
              {payments.map((p) => {
                const c = contracts.get(p.contract_id);
                const m = milestones.get(p.milestone_id);
                const [label, tone] = statusMap[p.status] ?? [p.status, "neutral"];
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-5 py-3">{formatDate(p.paid_at ?? p.created_at)}</td>
                    <td className="px-3 py-3"><Link href={`/contracts/${p.contract_id}`} className="font-mono hover:underline">{c?.code ?? "—"}</Link></td>
                    <td className="max-w-[220px] truncate px-3 py-3">{m ? `${m.seq}. ${m.title}` : "—"}</td>
                    <td className="px-3 py-3 text-right">{formatINR(p.amount)}</td>
                    <td className="px-3 py-3 text-right">{formatINR(p.platform_fee)}</td>
                    <td className="px-3 py-3 text-right">{formatINR(p.gst)}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatINR(p.amount + p.platform_fee + p.gst)}</td>
                    <td className="px-3 py-3"><Badge tone={tone}>{label}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      {(p.status === "paid" || p.status === "refunded") && <Link href={`/client/payments/${p.id}/invoice`} className="font-medium text-ink-700 hover:text-ink-900">Invoice</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
