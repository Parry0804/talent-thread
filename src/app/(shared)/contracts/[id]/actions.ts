"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  acceptOffer, declineOffer, startFunding, confirmCheckout, submitWork, requestChanges, releaseMilestone,
} from "@/lib/escrow";
import { contractAccess } from "@/components/contracts/data";
import { errorMessage } from "@/components/contracts/util";
import type { ActionState } from "@/components/ui/action-form";
import type { ConfirmFundingResult, StartFundingResult } from "@/components/contracts/razorpay-checkout-button";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const refresh = (contractId: string) => {
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/contracts");
};

export async function acceptOfferAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const id = str(fd, "contract_id");
  try {
    await acceptOffer(viewer.id, id);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(id);
  return { notice: "Offer accepted. We've told the client to fund milestone 1." };
}

export async function declineOfferAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const id = str(fd, "contract_id");
  try {
    await declineOffer(viewer.id, id);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(id);
  return { notice: "Offer declined." };
}

export async function startFundingAction(milestoneId: string): Promise<StartFundingResult> {
  const viewer = await requireOnboarded("client");
  try {
    const order = await startFunding(viewer.id, milestoneId);
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return {
      order: {
        orderId: order.orderId,
        amountPaise: order.amountPaise,
        keyId: order.keyId,
        description: `${order.contractCode} · ${order.milestoneTitle}`.slice(0, 250),
        prefill: { name: viewer.full_name || undefined, email: data.user?.email ?? undefined, contact: viewer.phone ?? undefined },
      },
    };
  } catch (e) {
    return { error: errorMessage(e, "We couldn't start the payment. Please try again.") };
  }
}

export async function confirmFundingAction(orderId: string, paymentId: string, signature: string): Promise<ConfirmFundingResult> {
  const viewer = await requireOnboarded("client");
  try {
    const milestoneId = await confirmCheckout(viewer.id, orderId, paymentId, signature);
    const db = createServiceClient();
    const { data } = await db.from("milestones").select("contract_id").eq("id", milestoneId).single();
    if (data) refresh(data.contract_id);
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function submitWorkAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const contractId = str(fd, "contract_id");
  const files = fd.getAll("file_paths").map(String).filter((p) => p.startsWith(`${viewer.id}/`));
  const links = str(fd, "links")
    .split(/\s+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^https?:\/\//i.test(l) ? l : `https://${l}`));
  try {
    await submitWork(viewer.id, str(fd, "milestone_id"), str(fd, "note"), files, links);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(contractId);
  return { notice: "Work submitted. The client has 5 days to review it." };
}

export async function releaseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("client");
  const contractId = str(fd, "contract_id");
  try {
    await releaseMilestone(viewer.id, str(fd, "milestone_id"));
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(contractId);
  return { notice: "Approved. The payment is on its way to the designer." };
}

export async function requestChangesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("client");
  const contractId = str(fd, "contract_id");
  try {
    await requestChanges(viewer.id, str(fd, "milestone_id"), str(fd, "feedback"));
  } catch (e) {
    return { error: errorMessage(e) };
  }
  refresh(contractId);
  return { notice: "Feedback sent to the designer." };
}

export async function leaveReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer", "client");
  const contractId = str(fd, "contract_id");
  const access = await contractAccess(viewer, contractId);
  if (!access?.isParty) return { error: "Only the client and designer on this contract can leave a review." };
  if (access.contract.status !== "completed") return { error: "You can leave a review once the contract is completed." };
  const rating = Number(fd.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5 stars." };
  const comment = str(fd, "comment").slice(0, 2000);

  const db = createServiceClient();
  const { error } = await db.from("reviews").insert({
    contract_id: contractId,
    reviewer_id: viewer.id,
    reviewee_id: access.otherId,
    rating,
    comment,
  });
  if (error) return { error: error.code === "23505" ? "You've already reviewed this contract." : "We couldn't save your review. Please try again." };
  refresh(contractId);
  return { notice: "Thanks! Your review is live." };
}
