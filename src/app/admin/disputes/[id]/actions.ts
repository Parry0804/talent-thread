"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { resolveDispute } from "@/lib/escrow";
import { errorMessage } from "@/components/contracts/util";
import type { ActionState } from "@/components/ui/action-form";

export async function resolveDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(fd.get("dispute_id") ?? "");
  const resolution = String(fd.get("resolution") ?? "");
  if (resolution !== "release" && resolution !== "refund" && resolution !== "split") return { error: "Choose release, refund or split." };
  const pct = Number(fd.get("designer_pct") ?? 50);
  if (resolution === "split" && (!Number.isFinite(pct) || pct <= 0 || pct >= 100)) return { error: "For a split, the designer's share must be between 1% and 99%." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 2000);
  if (note.length < 10) return { error: "Write a short note explaining the decision. Both parties will see it." };
  try {
    await resolveDispute(admin.id, id, resolution, pct, note);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/admin/disputes/${id}`);
  revalidatePath("/admin/disputes");
  return { notice: "Dispute resolved. Both parties have been notified." };
}
