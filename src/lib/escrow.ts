import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { razorpay, verifyCheckoutSignature } from "@/lib/razorpay";
import { AUTO_APPROVE_DAYS, MAX_REVISIONS, clientCharge, designerPayout, formatINR } from "@/lib/money";
import { audit, notify, systemMessage } from "@/lib/notify";
import { env } from "@/lib/env";
import type { Contract, Milestone } from "@/lib/types";

// Every money and contract state change goes through this file. Each function
// checks who is acting, then writes with the service role.

export class EscrowError extends Error {}

async function load(milestoneId: string) {
  const db = createServiceClient();
  const { data: m } = await db.from("milestones").select("*").eq("id", milestoneId).single<Milestone>();
  if (!m) throw new EscrowError("Milestone not found.");
  const { data: c } = await db.from("contracts").select("*").eq("id", m.contract_id).single<Contract>();
  if (!c) throw new EscrowError("Contract not found.");
  return { db, m, c };
}

async function admins() {
  const db = createServiceClient();
  const { data } = await db.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((r) => r.id as string);
}

// ───────────── Offers ─────────────

export interface MilestoneDraft { title: string; description?: string; amount: number; due_date?: string | null }

/** Client sends an offer to an applicant: creates a pending contract with milestones. */
export async function createOffer(clientId: string, applicationId: string, title: string, scope: string, milestones: MilestoneDraft[]) {
  const db = createServiceClient();
  const { data: app } = await db.from("applications").select("*, jobs!inner(id, client_id, title)").eq("id", applicationId).single();
  if (!app || app.jobs.client_id !== clientId) throw new EscrowError("You can only hire applicants to your own jobs.");
  if (!milestones.length) throw new EscrowError("Add at least one milestone.");
  if (milestones.some((m) => !m.title.trim() || !(m.amount > 0))) throw new EscrowError("Every milestone needs a title and an amount.");

  const { count: previous } = await db
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("designer_id", app.designer_id)
    .eq("status", "completed");

  const total = milestones.reduce((s, m) => s + Math.round(m.amount), 0);
  const { data: contract, error } = await db
    .from("contracts")
    .insert({
      job_id: app.job_id,
      application_id: app.id,
      client_id: clientId,
      designer_id: app.designer_id,
      title: title || app.jobs.title,
      scope,
      total_amount: total,
      status: "pending",
      repeat_hire: (previous ?? 0) > 0,
    })
    .select()
    .single<Contract>();
  if (error || !contract) throw new EscrowError("Couldn't create the contract.");

  await db.from("milestones").insert(
    milestones.map((m, i) => ({
      contract_id: contract.id,
      seq: i + 1,
      title: m.title.trim(),
      description: m.description ?? "",
      amount: Math.round(m.amount),
      due_date: m.due_date || null,
    })),
  );
  await db.from("applications").update({ status: "hired" }).eq("id", app.id);
  await notify(app.designer_id, "offer", `New offer: ${contract.title}`, `${formatINR(total)} across ${milestones.length} milestone(s).`, `/contracts/${contract.id}`);
  await audit(clientId, "contract.offer", "contract", contract.id, { total });
  return contract;
}

export async function acceptOffer(designerId: string, contractId: string) {
  const db = createServiceClient();
  const { data: c } = await db.from("contracts").select("*").eq("id", contractId).single<Contract>();
  if (!c || c.designer_id !== designerId) throw new EscrowError("This offer isn't yours.");
  if (c.status !== "pending") throw new EscrowError("This offer has already been answered.");
  await db.from("contracts").update({ status: "active", accepted_at: new Date().toISOString() }).eq("id", c.id);
  if (c.job_id) await db.from("jobs").update({ status: "filled" }).eq("id", c.job_id);
  await systemMessage(c.id, designerId, "Offer accepted. The client can now fund milestone 1.");
  await notify(c.client_id, "offer_accepted", "Offer accepted", `Fund milestone 1 of “${c.title}” to start work.`, `/contracts/${c.id}`);
  await audit(designerId, "contract.accept", "contract", c.id);
}

export async function declineOffer(designerId: string, contractId: string) {
  const db = createServiceClient();
  const { data: c } = await db.from("contracts").select("*").eq("id", contractId).single<Contract>();
  if (!c || c.designer_id !== designerId || c.status !== "pending") throw new EscrowError("This offer can't be declined.");
  await db.from("contracts").update({ status: "cancelled" }).eq("id", c.id);
  if (c.application_id) await db.from("applications").update({ status: "rejected" }).eq("id", c.application_id);
  await notify(c.client_id, "offer_declined", "Offer declined", `The designer declined “${c.title}”.`, `/contracts/${c.id}`);
}

// ───────────── Funding (client → escrow) ─────────────

/** Creates a Razorpay order for a milestone. The browser opens Checkout with it. */
export async function startFunding(clientId: string, milestoneId: string) {
  const { db, m, c } = await load(milestoneId);
  if (c.client_id !== clientId) throw new EscrowError("Only the client on this contract can fund it.");
  if (c.status !== "active") throw new EscrowError("The designer needs to accept the offer first.");
  if (m.status !== "awaiting_funding") throw new EscrowError("This milestone is already funded.");

  const charge = clientCharge(m.amount);
  const order = await razorpay().orders.create({
    amount: charge.total * 100,
    currency: "INR",
    receipt: `${c.code}-M${m.seq}`.slice(0, 40),
    notes: { milestone_id: m.id, contract_id: c.id },
  });
  await db.from("payments").insert({
    milestone_id: m.id,
    contract_id: c.id,
    client_id: clientId,
    amount: charge.amount,
    platform_fee: charge.fee,
    gst: charge.gst,
    total_paise: charge.total * 100,
    razorpay_order_id: order.id,
  });
  return { orderId: order.id, amountPaise: charge.total * 100, keyId: env.razorpayKeyId, contractCode: c.code, milestoneTitle: m.title };
}

/** Marks an order paid. Safe to call twice (Checkout callback and webhook). */
export async function markOrderPaid(orderId: string, paymentId: string) {
  const db = createServiceClient();
  const { data: p } = await db.from("payments").select("*").eq("razorpay_order_id", orderId).single();
  if (!p) throw new EscrowError("Payment not found.");
  if (p.status === "paid") return p.milestone_id as string;

  const now = new Date().toISOString();
  await db.from("payments").update({ status: "paid", razorpay_payment_id: paymentId, paid_at: now }).eq("id", p.id);
  const { data: m } = await db
    .from("milestones")
    .update({ status: "funded", funded_at: now })
    .eq("id", p.milestone_id)
    .eq("status", "awaiting_funding")
    .select()
    .single<Milestone>();
  const { data: c } = await db.from("contracts").select("*").eq("id", p.contract_id).single<Contract>();
  if (m && c) {
    await systemMessage(c.id, c.client_id, `Milestone ${m.seq} funded: ${formatINR(m.amount)} is now held safely in escrow.`);
    await notify(c.designer_id, "milestone_funded", `Milestone ${m.seq} funded`, `${formatINR(m.amount)} is in escrow. You can start work on “${m.title}”.`, `/contracts/${c.id}`);
    await audit(c.client_id, "milestone.funded", "milestone", m.id, { amount: m.amount, orderId, paymentId });
  }
  return p.milestone_id as string;
}

export async function confirmCheckout(clientId: string, orderId: string, paymentId: string, signature: string) {
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) throw new EscrowError("We couldn't verify this payment. If money left your account, it will be refunded automatically.");
  const db = createServiceClient();
  const { data: p } = await db.from("payments").select("client_id").eq("razorpay_order_id", orderId).single();
  if (!p || p.client_id !== clientId) throw new EscrowError("Payment not found.");
  return markOrderPaid(orderId, paymentId);
}

// ───────────── Delivery ─────────────

export async function submitWork(designerId: string, milestoneId: string, note: string, filePaths: string[], links: string[]) {
  const { db, m, c } = await load(milestoneId);
  if (c.designer_id !== designerId) throw new EscrowError("Only the designer on this contract can submit work.");
  if (!["funded", "changes_requested"].includes(m.status)) throw new EscrowError("This milestone isn't ready for a submission.");
  if (!note.trim() && !filePaths.length && !links.length) throw new EscrowError("Add files, links or a note.");

  const now = new Date();
  const autoAt = new Date(now.getTime() + AUTO_APPROVE_DAYS * 86400_000).toISOString();
  await db.from("submissions").insert({ milestone_id: m.id, designer_id: designerId, note, file_paths: filePaths, links });
  await db.from("milestones").update({ status: "submitted", submitted_at: now.toISOString(), auto_approve_at: autoAt }).eq("id", m.id);
  await systemMessage(c.id, designerId, `Work submitted for milestone ${m.seq}. The client has ${AUTO_APPROVE_DAYS} days to review before it's approved automatically.`);
  await notify(c.client_id, "work_submitted", `Review milestone ${m.seq}`, `“${m.title}” was submitted. It auto-approves in ${AUTO_APPROVE_DAYS} days.`, `/contracts/${c.id}`);
}

export async function requestChanges(clientId: string, milestoneId: string, feedback: string) {
  const { db, m, c } = await load(milestoneId);
  if (c.client_id !== clientId) throw new EscrowError("Only the client can request changes.");
  if (m.status !== "submitted") throw new EscrowError("There's no submission to review.");
  if (m.revision_count >= MAX_REVISIONS) throw new EscrowError(`This milestone has used its ${MAX_REVISIONS} revision rounds. Approve it, or raise a dispute if something is wrong.`);
  if (!feedback.trim()) throw new EscrowError("Tell the designer what to change.");

  const { data: last } = await db.from("submissions").select("id").eq("milestone_id", m.id).order("created_at", { ascending: false }).limit(1).single();
  if (last) await db.from("submissions").update({ feedback }).eq("id", last.id);
  await db.from("milestones").update({ status: "changes_requested", revision_count: m.revision_count + 1, auto_approve_at: null }).eq("id", m.id);
  await systemMessage(c.id, clientId, `Changes requested on milestone ${m.seq} (round ${m.revision_count + 1} of ${MAX_REVISIONS}): ${feedback}`);
  await notify(c.designer_id, "changes_requested", `Changes requested on milestone ${m.seq}`, feedback.slice(0, 140), `/contracts/${c.id}`);
}

/** Approve and release to the designer. `actorId` null means auto-approval. */
export async function releaseMilestone(actorId: string | null, milestoneId: string) {
  const { db, m, c } = await load(milestoneId);
  if (actorId && c.client_id !== actorId) throw new EscrowError("Only the client can approve this work.");
  if (m.status !== "submitted") throw new EscrowError("This milestone isn't waiting for approval.");

  const now = new Date().toISOString();
  const payout = designerPayout(m.amount, c.repeat_hire);
  const { data: updated } = await db
    .from("milestones")
    .update({ status: "released", approved_at: now, released_at: now })
    .eq("id", m.id)
    .eq("status", "submitted")
    .select("id");
  if (!updated?.length) return; // someone else released it first
  await db.from("payouts").insert({ milestone_id: m.id, designer_id: c.designer_id, ...payout });

  const { data: rest } = await db.from("milestones").select("status").eq("contract_id", c.id);
  if (rest?.every((r) => r.status === "released" || r.status === "refunded")) {
    await db.from("contracts").update({ status: "completed", completed_at: now }).eq("id", c.id);
  }
  await systemMessage(c.id, actorId ?? c.client_id, `${actorId ? "Approved" : "Auto-approved"}: ${formatINR(m.amount)} released for milestone ${m.seq}.`);
  await notify(c.designer_id, "payment_released", `${formatINR(payout.net)} is on its way`, `Milestone ${m.seq} of “${c.title}” was ${actorId ? "approved" : "auto-approved"}. Payout after 10% commission and 0.1% TDS.`, `/designer/earnings`);
  await audit(actorId, "milestone.released", "milestone", m.id, { ...payout, auto: !actorId });
}

export async function runAutoApprovals() {
  const db = createServiceClient();
  const { data } = await db.from("milestones").select("id").eq("status", "submitted").lte("auto_approve_at", new Date().toISOString());
  for (const r of data ?? []) await releaseMilestone(null, r.id);
  return data?.length ?? 0;
}

// ───────────── Disputes ─────────────

export async function raiseDispute(userId: string, milestoneId: string, reason: string, details: string, evidence: string[] = []) {
  const { db, m, c } = await load(milestoneId);
  if (c.client_id !== userId && c.designer_id !== userId) throw new EscrowError("Only people on this contract can raise a dispute.");
  if (!["funded", "submitted", "changes_requested"].includes(m.status)) throw new EscrowError("Disputes are for funded milestones that haven't been released.");
  if (!reason.trim()) throw new EscrowError("Choose a reason.");

  const { data: d } = await db
    .from("disputes")
    .insert({ contract_id: c.id, milestone_id: m.id, raised_by: userId, reason, details, evidence_paths: evidence })
    .select("id")
    .single();
  await db.from("milestones").update({ status: "disputed", auto_approve_at: null }).eq("id", m.id);
  await db.from("contracts").update({ status: "disputed" }).eq("id", c.id);
  await systemMessage(c.id, userId, `A dispute was raised on milestone ${m.seq}. Funds stay in escrow while the Talent Thread team reviews it.`);
  const other = userId === c.client_id ? c.designer_id : c.client_id;
  await notify(other, "dispute", `Dispute raised on “${c.title}”`, reason, `/contracts/${c.id}`);
  for (const a of await admins()) await notify(a, "dispute", "New dispute to review", `${c.code} · ${reason}`, `/admin/disputes/${d?.id}`);
  await audit(userId, "dispute.raised", "dispute", d?.id ?? "", { milestoneId });
}

/** Admin decision. Release pays the designer; refund returns money to the client; split does both. */
export async function resolveDispute(adminId: string, disputeId: string, resolution: "release" | "refund" | "split", designerPct: number, note: string) {
  const db = createServiceClient();
  const { data: who } = await db.from("profiles").select("role").eq("id", adminId).single();
  if (who?.role !== "admin") throw new EscrowError("Only admins can resolve disputes.");
  const { data: d } = await db.from("disputes").select("*").eq("id", disputeId).single();
  if (!d || d.status !== "open") throw new EscrowError("This dispute is already resolved.");
  const { m, c } = await load(d.milestone_id);

  const pct = resolution === "release" ? 100 : resolution === "refund" ? 0 : Math.max(0, Math.min(100, Math.round(designerPct)));
  const designerAmount = Math.round((m.amount * pct) / 100);
  const refundAmount = m.amount - designerAmount;
  const now = new Date().toISOString();

  if (refundAmount > 0) {
    const { data: pay } = await db.from("payments").select("*").eq("milestone_id", m.id).eq("status", "paid").single();
    if (pay?.razorpay_payment_id) {
      await razorpay().payments.refund(pay.razorpay_payment_id, { amount: refundAmount * 100, notes: { dispute_id: disputeId } });
      if (refundAmount === m.amount) await db.from("payments").update({ status: "refunded" }).eq("id", pay.id);
    }
  }
  if (designerAmount > 0) {
    await db.from("payouts").insert({ milestone_id: m.id, designer_id: c.designer_id, ...designerPayout(designerAmount, c.repeat_hire) });
  }
  await db.from("milestones").update({ status: designerAmount > 0 ? "released" : "refunded", released_at: now }).eq("id", m.id);
  await db
    .from("disputes")
    .update({ status: "resolved", resolution, designer_share_pct: pct, admin_note: note, resolved_by: adminId, resolved_at: now })
    .eq("id", d.id);

  const { count: open } = await db.from("disputes").select("id", { count: "exact", head: true }).eq("contract_id", c.id).eq("status", "open");
  const { data: rest } = await db.from("milestones").select("status").eq("contract_id", c.id);
  const done = rest?.every((r) => r.status === "released" || r.status === "refunded");
  await db.from("contracts").update({ status: done ? "completed" : open ? "disputed" : "active", completed_at: done ? now : null }).eq("id", c.id);

  const summary = `Dispute resolved: ${formatINR(designerAmount)} to the designer, ${formatINR(refundAmount)} refunded to the client.`;
  await systemMessage(c.id, adminId, `${summary}${note ? ` Note from Talent Thread: ${note}` : ""}`);
  await notify(c.client_id, "dispute_resolved", "Dispute resolved", summary, `/contracts/${c.id}`);
  await notify(c.designer_id, "dispute_resolved", "Dispute resolved", summary, `/contracts/${c.id}`);
  await audit(adminId, "dispute.resolved", "dispute", d.id, { resolution, pct, designerAmount, refundAmount });
}
