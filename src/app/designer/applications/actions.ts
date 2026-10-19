"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { audit, notify } from "@/lib/notify";
import type { ActionState } from "@/components/ui/action-form";

/** Designers can't update applications under RLS, so this uses the service client after checking ownership and status. */
export async function withdrawApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const id = String(fd.get("application_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "That application couldn't be found." };
  const db = createServiceClient();
  const { data: app } = await db.from("applications").select("id, designer_id, status, job_id").eq("id", id).single();
  if (!app || app.designer_id !== viewer.id) return { error: "That application couldn't be found." };
  if (!["submitted", "shortlisted"].includes(app.status)) return { error: "This application can no longer be withdrawn." };

  const { data: updated, error } = await db
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .eq("designer_id", viewer.id)
    .in("status", ["submitted", "shortlisted"])
    .select("id");
  if (error || !updated?.length) return { error: "We couldn't withdraw that. Please try again." };

  const { data: job } = await db.from("jobs").select("client_id, title").eq("id", app.job_id).single();
  if (job && app.status === "shortlisted") {
    await notify(job.client_id, "application_withdrawn", `${viewer.full_name || "A designer"} withdrew from “${job.title}”`, "", `/client/jobs/${app.job_id}/applicants`);
  }
  await audit(viewer.id, "application.withdraw", "application", id);
  revalidatePath("/designer/applications");
  redirect(`/designer/applications/${id}`);
}
