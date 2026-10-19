"use server";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/client/data";
import { sendInvite } from "@/lib/client/invites";
import type { ActionState } from "@/components/ui/action-form";

export async function inviteDesigner(_: ActionState, fd: FormData): Promise<ActionState> {
  const { viewer, company } = await requireClient();
  const jobId = String(fd.get("job_id") ?? "");
  const designerId = String(fd.get("designer_id") ?? "");
  const message = String(fd.get("message") ?? "").trim();
  if (!jobId) return { error: "Choose which job to invite them to." };
  if (message.length > 1000) return { error: "Keep the message under 1,000 characters." };
  const err = await sendInvite(viewer.id, company.company_name, jobId, designerId, message);
  if (err) return { error: err };
  revalidatePath(`/client/designers/${designerId}/invite`);
  return { notice: "Invite sent. They'll get a notification with a link to your job." };
}
