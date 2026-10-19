import Link from "next/link";
import { Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { EmptyRow, FilterTabs, Table, Td } from "@/components/admin/table";
import { ConfirmForm } from "@/components/contracts/confirm-form";
import { people } from "@/components/contracts/data";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { markPayoutPaid } from "./actions";

export const metadata = { title: "Payments" };

const payTone: Record<string, Tone> = { created: "neutral", paid: "success", failed: "danger", refunded: "warning" };
const outTone: Record<string, Tone> = { pending: "warning", processing: "info", paid: "success", failed: "danger" };

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireRole("admin");
  const sp = await searchParams;
  const view = sp.view === "payments" ? "payments" : "payouts";
  const db = createServiceClient();

  const [{ data: payments }, { data: payouts }] = await Promise.all([
    db.from("payments").select("*, contracts(code, title)").order("created_at", { ascending: false }).limit(200),
    db.from("payouts").select("*, milestones(seq, title, contract_id, contracts(code, title))").order("status").order("created_at", { ascending: true }).limit(200),
  ]);
  type PaymentRow = { id: string; client_id: string; contract_id: string; amount: number; platform_fee: number; gst: number; total_paise: number; status: string; razorpay_order_id: string | null; razorpay_payment_id: string | null; created_at: string; paid_at: string | null; contracts: { code: string; title: string } | null };
  type PayoutRow = { id: string; designer_id: string; gross: number; commission: number; tds: number; net: number; status: string; reference: string | null; created_at: string; paid_at: string | null; milestones: { seq: number; title: string; contract_id: string; contracts: { code: string; title: string } | null } | null };
  const pays = (payments ?? []) as PaymentRow[];
  const outs = (payouts ?? []) as PayoutRow[];
  const designerIds = outs.map((p) => p.designer_id);
  const [{ data: dps }, { data: bank }] = designerIds.length
    ? await Promise.all([
        db.from("designer_profiles").select("id, kyc_verified").in("id", designerIds),
        db.from("designer_payout").select("id, payout_upi").in("id", designerIds),
      ])
    : [{ data: [] }, { data: [] }];
  const upiOf = new Map((bank ?? []).map((b) => [b.id as string, b.payout_upi as string | null]));
  const upi = new Map((dps ?? []).map((d) => [d.id as string, { kyc_verified: d.kyc_verified as boolean, payout_upi: upiOf.get(d.id) ?? null }]));
  const who = await people([...pays.map((p) => p.client_id), ...designerIds]);
  const pendingTotal = outs.filter((p) => p.status === "pending").reduce((a, p) => a + p.net, 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Payments" sub="Money in from clients (Razorpay) and money out to designers." />
      <div className="mb-5 flex items-start gap-2 rounded-md border border-info-600/20 bg-info-50 px-4 py-3 text-sm text-info-600">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          Automatic payouts through RazorpayX aren&apos;t connected yet. Pay each designer by UPI or bank transfer, then mark the payout as paid here with the
          UTR/reference. {pendingTotal > 0 && <strong>{formatINR(pendingTotal)} is waiting to be paid.</strong>}
        </span>
      </div>
      <div className="mb-5">
        <FilterTabs
          active={view}
          items={[
            { key: "payouts", label: `Payouts to designers (${outs.length})`, href: "/admin/payments?view=payouts" },
            { key: "payments", label: `Payments from clients (${pays.length})`, href: "/admin/payments?view=payments" },
          ]}
        />
      </div>

      {view === "payouts" ? (
        <Table head={["Designer", "Milestone", "Gross", "Commission", "TDS", "Net to pay", "Status", "Action"]}>
          {outs.length === 0 ? (
            <EmptyRow cols={8}>No payouts yet. One is created each time a client approves a milestone.</EmptyRow>
          ) : (
            outs.map((p) => {
              const d = upi.get(p.designer_id);
              return (
                <tr key={p.id}>
                  <Td>
                    <Link href={`/admin/users/${p.designer_id}`} className="font-medium hover:underline">{who.get(p.designer_id)?.name ?? "Designer"}</Link>
                    <div className="text-xs text-ink-500">
                      {d?.payout_upi ? `UPI ${d.payout_upi}` : "No UPI added"}
                      {d && !d.kyc_verified ? " · KYC pending" : ""}
                    </div>
                  </Td>
                  <Td>
                    {p.milestones ? (
                      <Link href={`/contracts/${p.milestones.contract_id}`} className="hover:underline">
                        M{p.milestones.seq}: {p.milestones.title}
                      </Link>
                    ) : "—"}
                    <div className="font-mono text-xs text-ink-400">{p.milestones?.contracts?.code}</div>
                  </Td>
                  <Td className="tabular">{formatINR(p.gross)}</Td>
                  <Td className="tabular text-ink-500">{formatINR(p.commission)}</Td>
                  <Td className="tabular text-ink-500">{formatINR(p.tds)}</Td>
                  <Td className="font-semibold tabular">{formatINR(p.net)}</Td>
                  <Td>
                    <Badge tone={outTone[p.status] ?? "neutral"}>{p.status}</Badge>
                    <div className="mt-1 text-xs text-ink-400">{p.paid_at ? `Paid ${formatDate(p.paid_at)}` : `Since ${formatDate(p.created_at)}`}</div>
                  </Td>
                  <Td>
                    {p.status === "paid" ? (
                      <span className="font-mono text-xs text-ink-500">{p.reference}</span>
                    ) : (
                      <ConfirmForm
                        action={markPayoutPaid}
                        fields={{ payout_id: p.id }}
                        size="sm"
                        label="Mark payout as paid"
                        confirmLabel={`Confirm ${formatINR(p.net)} paid`}
                        message="Only do this after the money has left your account."
                        className="min-w-60"
                      >
                        <Input name="reference" required placeholder="UTR / reference number" />
                      </ConfirmForm>
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </Table>
      ) : (
        <Table head={["Client", "Contract", "Milestone amount", "Fee", "GST", "Total charged", "Razorpay", "Status"]}>
          {pays.length === 0 ? (
            <EmptyRow cols={8}>No payments yet. They appear when a client funds a milestone.</EmptyRow>
          ) : (
            pays.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{who.get(p.client_id)?.name ?? "Client"}</Td>
                <Td>
                  <Link href={`/contracts/${p.contract_id}`} className="hover:underline">{p.contracts?.title}</Link>
                  <div className="font-mono text-xs text-ink-400">{p.contracts?.code}</div>
                </Td>
                <Td className="tabular">{formatINR(p.amount)}</Td>
                <Td className="tabular text-ink-500">{formatINR(p.platform_fee)}</Td>
                <Td className="tabular text-ink-500">{formatINR(p.gst)}</Td>
                <Td className="font-semibold tabular">{formatINR(Math.round(p.total_paise / 100))}</Td>
                <Td className="font-mono text-xs text-ink-500">
                  <div>{p.razorpay_order_id}</div>
                  <div>{p.razorpay_payment_id}</div>
                </Td>
                <Td>
                  <Badge tone={payTone[p.status] ?? "neutral"}>{p.status}</Badge>
                  <div className="mt-1 text-xs text-ink-400">{formatDate(p.paid_at ?? p.created_at)}</div>
                </Td>
              </tr>
            ))
          )}
        </Table>
      )}
    </>
  );
}
