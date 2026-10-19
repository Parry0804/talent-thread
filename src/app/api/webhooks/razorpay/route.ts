import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/razorpay";
import { markOrderPaid } from "@/lib/escrow";

// Razorpay → Talent Thread. Set this URL in Razorpay Dashboard → Settings → Webhooks
// with the events payment.captured and order.paid, and the same secret as RAZORPAY_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhook(raw, signature)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;
    const paymentId = payment?.id;
    if (orderId && paymentId) {
      try {
        // Idempotent: markOrderPaid returns early if the order is already paid.
        await markOrderPaid(orderId, paymentId);
      } catch (e) {
        // Unknown orders (e.g. from another app on the same Razorpay account) are acknowledged, not retried.
        console.error("razorpay webhook:", e instanceof Error ? e.message : e);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
