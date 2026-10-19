import Link from "next/link";
import { BadgeCheck, Info, Landmark, Lock, ShieldAlert } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fyLabel, fyStart } from "@/components/designer-work/data";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Contract, Milestone } from "@/lib/types";

export const metadata = { title: "Earnings" };

interface Payout {
  id: string;
  milestone_id: string;
  gross: number;
  commission: number;
  tds: number;
  net: number;
  status: "pending" | "processing" | "paid" | "failed";
  reference: string | null;
  created_at: string;
  paid_at: string | null;
}

const payoutTone: Record<Payout["status"], [string, Tone]> = {
  pending: ["Pending", "warning"],
  processing: ["Processing", "info"],
  paid: ["Paid", "success"],
  failed: ["Failed", "danger"],
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export default async function EarningsPage() {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const [{ data: contractRows }, { data: payoutRows }, { data: kyc }, { data: pay }] = await Promise.all([
    supabase.from("contracts").select("id, code, title, repeat_hire").eq("designer_id", viewer.id),
    supabase.from("payouts").select("*").eq("designer_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("designer_profiles").select("kyc_verified").eq("id", viewer.id).single(),
    supabase.from("designer_payout").select("payout_upi, pan_last4").eq("id", viewer.id).maybeSingle(),
  ]);
  const dp = { kyc_verified: Boolean(kyc?.kyc_verified), payout_upi: pay?.payout_upi ?? null, pan_last4: pay?.pan_last4 ?? null };
  const contracts = (contractRows ?? []) as Pick<Contract, "id" | "code" | "title" | "repeat_hire">[];
  const payouts = (payoutRows ?? []) as Payout[];
  const { data: msRows } = contracts.length
    ? await supabase.from("milestones").select("*").in("contract_id", contracts.map((c) => c.id))
    : { data: [] };
  const milestones = (msRows ?? []) as Milestone[];
  const msById = new Map(milestones.map((m) => [m.id, m]));
  const cById = new Map(contracts.map((c) => [c.id, c]));

  const inEscrow = sum(milestones.filter((m) => ["funded", "submitted", "changes_requested"].includes(m.status)).map((m) => m.amount));
  const pending = payouts.filter((p) => p.status === "pending" || p.status === "processing");
  const paid = payouts.filter((p) => p.status === "paid");
  const fy = fyStart();
  const fyPayouts = payouts.filter((p) => new Date(p.created_at) >= fy && p.status !== "failed");
  const fyNet = sum(fyPayouts.map((p) => p.net));
  const fyGross = sum(fyPayouts.map((p) => p.gross));
  const fyTds = sum(fyPayouts.map((p) => p.tds));
  const fyCommission = sum(fyPayouts.map((p) => p.commission));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Earnings" sub="Money held in escrow for your work, payouts on the way, and what you've been paid." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In escrow for you" value={formatINR(inEscrow)} sub="Funded by clients, released when work is approved" icon={<Lock size={16} />} />
        <Stat label="Pending payout" value={formatINR(sum(pending.map((p) => p.net)))} sub={`${pending.length} payout${pending.length === 1 ? "" : "s"} being processed`} />
        <Stat label="Paid out" value={<span className="text-marigold-800">{formatINR(sum(paid.map((p) => p.net)))}</span>} sub="All time, after fees and TDS" />
        <Stat label={`This financial year`} value={formatINR(fyNet)} sub={`${fyLabel()} · from 1 April`} />
      </div>

      <Card className="mt-6 flex items-start gap-3 bg-paper-50 p-5 text-sm text-ink-700">
        <Info size={18} className="mt-0.5 shrink-0 text-ink-500" aria-hidden />
        <div>
          <p className="font-medium text-ink-900">How payouts work</p>
          <p className="mt-1">
            When a client approves a milestone (or it&apos;s auto-approved after 5 days), the money is released from escrow and a payout is created for you.
            Talent Thread then sends it to your UPI ID, minus our commission and 0.1% TDS. Automated bank transfers aren&apos;t switched on yet, so for now our team
            processes each payout by hand and marks it as paid here.
          </p>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="min-w-0">
          <CardHeader title="Payouts" sub="One row for each released milestone." />
          <CardBody>
            {payouts.length === 0 ? (
              <EmptyState
                title="No payouts yet"
                body="Payouts appear here once a client approves a milestone on one of your contracts. Win your first contract by applying to a job that fits you."
                action={<LinkButton href="/designer/jobs" variant="secondary">Find work</LinkButton>}
              />
            ) : (
              <div className="-mx-6 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-paper-200 text-left text-xs text-ink-500">
                      <th className="px-6 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Contract</th>
                      <th className="px-2 py-2 font-medium">Milestone</th>
                      <th className="px-2 py-2 text-right font-medium">Gross</th>
                      <th className="px-2 py-2 text-right font-medium">Commission</th>
                      <th className="px-2 py-2 text-right font-medium">TDS</th>
                      <th className="px-2 py-2 text-right font-medium">Net</th>
                      <th className="px-6 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-200">
                    {payouts.map((p) => {
                      const m = msById.get(p.milestone_id);
                      const c = m ? cById.get(m.contract_id) : undefined;
                      const [label, tone] = payoutTone[p.status];
                      return (
                        <tr key={p.id}>
                          <td className="whitespace-nowrap px-6 py-3 text-ink-600">{formatDate(p.paid_at ?? p.created_at)}</td>
                          <td className="px-2 py-3">{c ? <Link href={`/contracts/${c.id}`} className="font-mono text-ink-900 hover:underline">{c.code}</Link> : "—"}</td>
                          <td className="max-w-[180px] truncate px-2 py-3 text-ink-800">{m ? m.title : "—"}</td>
                          <td className="px-2 py-3 text-right tabular">{formatINR(p.gross)}</td>
                          <td className="px-2 py-3 text-right tabular text-ink-500">− {formatINR(p.commission)}</td>
                          <td className="px-2 py-3 text-right tabular text-ink-500">− {formatINR(p.tds)}</td>
                          <td className="px-2 py-3 text-right font-semibold tabular">{formatINR(p.net)}</td>
                          <td className="px-6 py-3"><Badge tone={tone}>{label}</Badge>{p.reference && <span className="ml-2 font-mono text-xs text-ink-400">{p.reference}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 font-semibold text-ink-900"><Landmark size={16} aria-hidden />Payout method</div>
            {dp?.payout_upi ? (
              <p className="mt-3 font-mono text-ink-900">{dp.payout_upi}</p>
            ) : (
              <p className="mt-3 text-sm text-danger-600">No UPI ID added yet. Add one so we can pay you.</p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              {dp?.kyc_verified ? (
                <><BadgeCheck size={15} className="text-success-600" aria-hidden /><span className="text-success-600">KYC verified{dp.pan_last4 ? ` · PAN ending ${dp.pan_last4}` : ""}</span></>
              ) : (
                <><ShieldAlert size={15} className="text-marigold-800" aria-hidden /><span className="text-ink-600">KYC not verified yet. Payouts may wait until it is.</span></>
              )}
            </p>
            <LinkButton href="/designer/profile" variant="secondary" size="sm" className="mt-4">{dp?.payout_upi ? "Edit payout details" : "Add UPI ID"}</LinkButton>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-ink-900">TDS summary · {fyLabel()}</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Gross earnings</dt><dd className="tabular">{formatINR(fyGross)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Commission</dt><dd className="tabular">{formatINR(fyCommission)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>TDS deducted</dt><dd className="tabular">{formatINR(fyTds)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-500">
              TDS deducted under Section 194-O at 0.1%, shown on Form 26AS against your PAN. You can claim it when you file your income tax return.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
