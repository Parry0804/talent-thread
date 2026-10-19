"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { audit, notify } from "@/lib/notify";
import { formatINR } from "@/lib/money";
import type { ActionState } from "@/components/ui/action-form";

/** Records a payout the admin made by hand (UPI / bank transfer). RazorpayX isn't connected yet. */
export async function markPayoutPaid(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(fd.get("payout_id") ?? "");
  const reference = String(fd.get("reference") ?? "").trim().slice(0, 120);
  if (reference.length < 4) return { error: "Add the UTR or transaction reference so the designer can trace it." };
  const db = createServiceClient();
  const { data: p } = await db.from("payouts").select("*").eq("id", id).maybeSingle();
  if (!p) return { error: "Payout not found." };
  if (p.status === "paid") return { notice: "Already marked as paid." };
  const { data: updated, error } = await db
    .from("payouts")
    .update({ status: "paid", paid_at: new Date().toISOString(), reference })
    .eq("id", id)
    .neq("status", "paid")
    .select("id");
  if (error || !updated?.length) return { error: "Couldn't update this payout." };
  await audit(admin.id, "payout.paid", "payout", id, { reference, net: p.net });
  await notify(p.designer_id, "payout_paid", `${formatINR(p.net)} has been sent to you`, `Reference: ${reference}`, "/designer/earnings");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { notice: "Payout marked as paid." };
}
