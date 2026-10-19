"use server";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { raiseDispute } from "@/lib/escrow";
import { contractAccess } from "@/components/contracts/data";
import { DISPUTE_REASONS, errorMessage } from "@/components/contracts/util";
import type { ActionState } from "@/components/ui/action-form";

export async function raiseDisputeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer", "client");
  const contractId = String(fd.get("contract_id") ?? "");
  const milestoneId = String(fd.get("milestone_id") ?? "");
  const reason = String(fd.get("reason") ?? "");
  const details = String(fd.get("details") ?? "").trim().slice(0, 5000);
  const evidence = fd.getAll("evidence_paths").map(String).filter((p) => p.startsWith(`${viewer.id}/`));

  const access = await contractAccess(viewer, contractId);
  if (!access?.isParty) return { error: "Only people on this contract can raise a dispute." };
  if (!(DISPUTE_REASONS as readonly string[]).includes(reason)) return { error: "Choose a reason." };
  if (details.length < 20) return { error: "Tell us what happened in a few sentences (at least 20 characters)." };
  try {
    await raiseDispute(viewer.id, milestoneId, reason, details, evidence);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect(`/contracts/${contractId}?disputed=1`);
}
