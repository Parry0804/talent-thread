"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import { clientCharge, formatINR } from "@/lib/money";

export interface FundingOrder {
  orderId: string;
  amountPaise: number;
  keyId: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}
export type StartFundingResult = { error: string; order?: undefined } | { order: FundingOrder; error?: undefined };
export type ConfirmFundingResult = { error?: string } | undefined;

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
function loadCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve(true));
    s.addEventListener("error", () => resolve(false));
    if (!existing) {
      s.src = SCRIPT;
      s.async = true;
      document.body.appendChild(s);
    }
  });
}

/** Shows the fee breakdown, then opens Razorpay Checkout for one milestone. */
export function RazorpayCheckoutButton({
  milestoneId,
  amount,
  start,
  confirm,
}: {
  milestoneId: string;
  amount: number;
  start: (milestoneId: string) => Promise<StartFundingResult>;
  confirm: (orderId: string, paymentId: string, signature: string) => Promise<ConfirmFundingResult>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const charge = clientCharge(amount);

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await start(milestoneId);
    if (res.error || !res.order) {
      setError(res.error ?? "We couldn't start the payment.");
      setBusy(false);
      return;
    }
    const ok = await loadCheckout();
    if (!ok || !window.Razorpay) {
      setError("We couldn't load Razorpay Checkout. Check your internet connection and try again.");
      setBusy(false);
      return;
    }
    const { order } = res;
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: "Talent Thread",
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#15131a" },
      handler: async (r: RazorpayResponse) => {
        const done = await confirm(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
        if (done?.error) setError(done.error);
        else setPaid(true);
        setBusy(false);
        router.refresh();
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", (r) => {
      setError(r.error?.description ?? "The payment didn't go through. No money was taken.");
      setBusy(false);
    });
    rzp.open();
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 rounded-md bg-paper-50 p-4 text-sm">
        <dt className="text-ink-500">Milestone amount (held in escrow)</dt>
        <dd className="text-right tabular">{formatINR(charge.amount)}</dd>
        <dt className="text-ink-500">Platform fee (3%)</dt>
        <dd className="text-right tabular">{formatINR(charge.fee)}</dd>
        <dt className="text-ink-500">GST on fee (18%)</dt>
        <dd className="text-right tabular">{formatINR(charge.gst)}</dd>
        <dt className="border-t border-paper-200 pt-1.5 font-semibold text-ink-900">You pay</dt>
        <dd className="border-t border-paper-200 pt-1.5 text-right font-semibold tabular text-ink-900">{formatINR(charge.total)}</dd>
      </dl>
      <FormError message={error} />
      {paid ? (
        <p className="text-sm text-success-600">Payment received. Updating the milestone…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={pay} disabled={busy}>
            <Lock size={14} />
            {busy ? "Opening Razorpay…" : `Fund ${formatINR(charge.total)}`}
          </Button>
          <span className="text-xs text-ink-500">UPI, cards and netbanking via Razorpay. The designer is paid only when you approve.</span>
        </div>
      )}
    </div>
  );
}
