import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClient } from "@/lib/client/data";
import { placeOfSupply, splitGst, SUPPLIER, SUPPLIER_STATE, SUPPLIER_STATE_CODE } from "@/lib/client/gst";
import { PrintButton } from "@/components/client/print-button";
import { formatINR, CLIENT_FEE_RATE } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata = { title: "GST invoice" };

interface Payment {
  id: string; milestone_id: string; contract_id: string; client_id: string; amount: number; platform_fee: number; gst: number;
  total_paise: number; razorpay_payment_id: string | null; status: string; created_at: string; paid_at: string | null;
}

const PRINT_CSS = `@media print { aside, header { display: none !important; } body { background: #fff !important; } .no-print { display: none !important; } main, .invoice { box-shadow: none !important; } }`;

export default async function InvoicePage({ params }: PageProps<"/client/payments/[id]/invoice">) {
  const { viewer, company, supabase } = await requireClient();
  const { id } = await params;
  const { data } = await supabase.from("payments").select("*").eq("id", id).eq("client_id", viewer.id).maybeSingle();
  const p = data as Payment | null;
  if (!p || (p.status !== "paid" && p.status !== "refunded")) notFound();

  const [{ data: c }, { data: m }] = await Promise.all([
    supabase.from("contracts").select("code, title, designer_id").eq("id", p.contract_id).single(),
    supabase.from("milestones").select("seq, title").eq("id", p.milestone_id).single(),
  ]);
  const { data: designer } = c ? await supabase.from("profiles").select("full_name").eq("id", c.designer_id).single() : { data: null };

  const issued = p.paid_at ?? p.created_at;
  const year = new Date(issued).getFullYear();
  const invoiceNo = `TT/${year}/${p.id.slice(0, 8).toUpperCase()}`;
  const pos = placeOfSupply(company.gstin, viewer.city);
  const split = splitGst(p.gst, pos.code);
  const taxable = p.platform_fee;
  const total = p.amount + p.platform_fee + p.gst;

  return (
    <div className="mx-auto max-w-3xl">
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/client/payments" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> Payments</Link>
        <PrintButton />
      </div>

      <article className="invoice rounded-lg border border-paper-200 bg-paper-0 p-8 text-sm shadow-card sm:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-paper-200 pb-6">
          <div>
            <div className="font-display text-2xl font-semibold">{SUPPLIER.name}</div>
            <div className="mt-1 text-ink-600">{SUPPLIER.legalName !== SUPPLIER.name && <>{SUPPLIER.legalName}<br /></>}{SUPPLIER.address}</div>
            <div className="mt-1 text-ink-600">GSTIN: <span className="font-mono">{SUPPLIER.gstin || "to be added"}</span> · State: {SUPPLIER_STATE} ({SUPPLIER_STATE_CODE})</div>
            {SUPPLIER.email && <div className="text-ink-600">{SUPPLIER.email}</div>}
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">Tax invoice</div>
            <div className="mt-1 font-mono font-semibold">{invoiceNo}</div>
            <div className="mt-1 text-ink-600">Date: {formatDate(issued)}</div>
            {p.razorpay_payment_id && <div className="text-xs text-ink-500">Payment ref: <span className="font-mono">{p.razorpay_payment_id}</span></div>}
          </div>
        </header>

        <section className="grid gap-6 border-b border-paper-200 py-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Billed to</div>
            <div className="mt-1 font-medium">{company.company_name || viewer.full_name}</div>
            {company.company_name && <div className="text-ink-600">Attn: {viewer.full_name}</div>}
            {viewer.city && <div className="text-ink-600">{viewer.city}</div>}
            <div className="text-ink-600">GSTIN: <span className="font-mono">{company.gstin || "Unregistered"}</span></div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Place of supply</div>
            <div className="mt-1">{pos.name}{pos.code ? ` (${pos.code})` : ""}</div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Contract</div>
            <div className="mt-1"><span className="font-mono">{c?.code}</span> · {c?.title}</div>
            <div className="text-ink-600">Milestone {m?.seq}: {m?.title}</div>
          </div>
        </section>

        <table className="mt-6 w-full tabular">
          <thead>
            <tr className="border-b border-paper-200 text-left text-xs text-ink-500">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium">SAC</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-100">
            <tr>
              <td className="py-3 pr-4">Platform service fee ({Math.round(CLIENT_FEE_RATE * 100)}% of milestone value)</td>
              <td className="py-3 font-mono">{SUPPLIER.sac}</td>
              <td className="py-3 text-right">{formatINR(taxable)}</td>
            </tr>
            {split.intra ? (
              <>
                <tr><td className="py-2 pl-4 text-ink-600">CGST @ 9%</td><td /><td className="py-2 text-right">{formatINR(split.cgst)}</td></tr>
                <tr><td className="py-2 pl-4 text-ink-600">SGST @ 9%</td><td /><td className="py-2 text-right">{formatINR(split.sgst)}</td></tr>
              </>
            ) : (
              <tr><td className="py-2 pl-4 text-ink-600">IGST @ 18%</td><td /><td className="py-2 text-right">{formatINR(split.igst)}</td></tr>
            )}
            <tr className="font-semibold">
              <td className="py-3">Total for taxable supply by {SUPPLIER.name}</td><td /><td className="py-3 text-right">{formatINR(taxable + p.gst)}</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">
                Milestone amount held in escrow on behalf of the designer{designer?.full_name ? ` (${designer.full_name})` : ""} (not a supply by {SUPPLIER.name})
              </td>
              <td className="py-3 text-ink-400">—</td>
              <td className="py-3 text-right">{formatINR(p.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink-900 font-display text-base font-semibold">
              <td className="pt-3">Total paid</td><td /><td className="pt-3 text-right">{formatINR(total)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-8 space-y-1 border-t border-paper-200 pt-4 text-xs text-ink-500">
          {p.status === "refunded" && <p className="font-medium text-ink-700">This milestone was later refunded. Contact Talent Thread support if you need a credit note.</p>}
          <p>Tax is charged only on {SUPPLIER.name}&apos;s platform fee. The milestone amount is collected as an escrow agent for the designer and released to them on approval; it is not a supply by {SUPPLIER.name} and attracts no GST on this invoice.</p>
          <p>{split.intra ? "Intra-state supply: CGST and SGST apply." : "Inter-state supply: IGST applies."} Whether reverse charge applies: No.</p>
          <p>This is a computer-generated invoice and needs no signature.</p>
        </footer>
      </article>
    </div>
  );
}
