"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findOwnedJob, requireClient } from "@/lib/client/data";
import { createOffer, EscrowError } from "@/lib/escrow";
import type { ActionState } from "@/components/ui/action-form";

const Milestones = z
  .array(
    z.object({
      title: z.string().trim().min(1, "Every milestone needs a title.").max(120),
      description: z.string().trim().max(1000).default(""),
      amount: z.coerce.number().int("Use whole rupees.").min(100, "Each milestone should be at least ₹100.").max(10_000_000),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
    }),
  )
  .min(1, "Add at least one milestone.")
  .max(10, "Keep it to 10 milestones or fewer.");

export async function sendOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const { viewer } = await requireClient();
  const job = await findOwnedJob(String(fd.get("job_id") ?? ""), viewer.id);
  if (!job) return { error: "We couldn't find that job." };
  const appId = String(fd.get("app_id") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  const scope = String(fd.get("scope") ?? "").trim();
  if (title.length < 3) return { error: "Give the contract a title." };
  if (scope.length < 20) return { error: "Describe the scope in a sentence or two so you both agree on what's included." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("milestones") ?? "[]"));
  } catch {
    return { error: "Something went wrong with the milestones. Please refresh and try again." };
  }
  const parsed = Milestones.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the milestones." };
  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.some((m) => m.due_date && m.due_date < today)) return { error: "Due dates can't be in the past." };

  let contractId: string;
  try {
    const contract = await createOffer(
      viewer.id,
      appId,
      title.slice(0, 120),
      scope.slice(0, 5000),
      parsed.data.map((m) => ({ title: m.title, description: m.description, amount: m.amount, due_date: m.due_date || null })),
    );
    contractId = contract.id;
  } catch (e) {
    if (e instanceof EscrowError) return { error: e.message };
    console.error("createOffer failed", e);
    return { error: "We couldn't send the offer. Please try again." };
  }
  redirect(`/contracts/${contractId}`);
}
