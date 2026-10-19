"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findOwnedJob, requireClient } from "@/lib/client/data";
import { audit } from "@/lib/notify";

export async function closeJob(fd: FormData): Promise<void> {
  const { viewer, supabase } = await requireClient();
  const job = await findOwnedJob(String(fd.get("id") ?? ""), viewer.id);
  if (!job || job.status !== "open") return;
  await supabase.from("jobs").update({ status: "closed" }).eq("id", job.id).eq("client_id", viewer.id);
  await audit(viewer.id, "job.closed", "job", job.id);
  revalidatePath("/client/jobs");
}

export async function reopenJob(fd: FormData): Promise<void> {
  const { viewer, supabase } = await requireClient();
  const job = await findOwnedJob(String(fd.get("id") ?? ""), viewer.id);
  if (!job || job.status !== "closed") return;
  await supabase.from("jobs").update({ status: "open", published_at: job.published_at ?? new Date().toISOString() }).eq("id", job.id).eq("client_id", viewer.id);
  await audit(viewer.id, "job.reopened", "job", job.id);
  redirect("/client/jobs?tab=open");
}

export async function deleteDraft(fd: FormData): Promise<void> {
  const { viewer, supabase } = await requireClient();
  const job = await findOwnedJob(String(fd.get("id") ?? ""), viewer.id);
  if (!job || job.status !== "draft") return;
  await supabase.from("jobs").delete().eq("id", job.id).eq("client_id", viewer.id).eq("status", "draft");
  revalidatePath("/client/jobs");
}
