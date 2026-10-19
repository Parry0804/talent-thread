"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/client/data";
import { sendInvite } from "@/lib/client/invites";

export async function quickInvite(fd: FormData): Promise<void> {
  const { viewer, company } = await requireClient();
  const jobId = String(fd.get("job_id") ?? "");
  const designerId = String(fd.get("designer_id") ?? "");
  const err = await sendInvite(viewer.id, company.company_name, jobId, designerId, String(fd.get("message") ?? ""));
  if (err) redirect(`/client/jobs/${jobId}/published?error=${encodeURIComponent(err)}`);
  revalidatePath(`/client/jobs/${jobId}/published`);
}
