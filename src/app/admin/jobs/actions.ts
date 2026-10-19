"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { audit, notify } from "@/lib/notify";
import type { ActionState } from "@/components/ui/action-form";

export async function closeJob(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(fd.get("job_id") ?? "");
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (reason.length < 5) return { error: "Add a short reason. The client will see it." };
  const db = createServiceClient();
  const { data: job } = await db.from("jobs").select("id, client_id, title, status").eq("id", id).maybeSingle();
  if (!job) return { error: "Job not found." };
  if (job.status === "closed") return { notice: "This job is already closed." };
  const { error } = await db.from("jobs").update({ status: "closed" }).eq("id", id);
  if (error) return { error: "Couldn't close this job." };
  await audit(admin.id, "job.close", "job", id, { reason, previous_status: job.status });
  await notify(job.client_id, "job_closed", `Your job “${job.title}” was closed by Talent Thread`, reason, "/client/jobs");
  revalidatePath("/admin/jobs");
  return { notice: "Job closed and hidden from designers." };
}
