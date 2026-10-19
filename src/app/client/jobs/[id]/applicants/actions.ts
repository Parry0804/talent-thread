"use server";
import { revalidatePath } from "next/cache";
import { findOwnedJob, requireClient } from "@/lib/client/data";
import { createServiceClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";

/** Applications can't be updated under RLS, so we check job ownership here and write with the service client. */
async function setStatus(fd: FormData, to: "shortlisted" | "rejected" | "submitted") {
  const { viewer } = await requireClient();
  const jobId = String(fd.get("job_id") ?? "");
  const appId = String(fd.get("app_id") ?? "");
  const job = await findOwnedJob(jobId, viewer.id);
  if (!job) return;
  const db = createServiceClient();
  const { data: app } = await db.from("applications").select("id, designer_id, status").eq("id", appId).eq("job_id", job.id).maybeSingle();
  if (!app || ["hired", "withdrawn"].includes(app.status)) return;
  if (app.status === to) return;
  await db.from("applications").update({ status: to }).eq("id", app.id).eq("job_id", job.id);
  if (to === "shortlisted") {
    await notify(app.designer_id, "shortlisted", "You've been shortlisted", `Your proposal for “${job.title}” made the shortlist.`, `/designer/applications`);
  } else if (to === "rejected") {
    await notify(app.designer_id, "application_declined", "Update on your proposal", `The client went another way on “${job.title}”. Keep going — new jobs are posted every day.`, `/designer/applications`);
  }
  revalidatePath(`/client/jobs/${job.id}/applicants`);
  revalidatePath(`/client/jobs/${job.id}/applicants/${app.id}`);
}

export async function shortlistApplicant(fd: FormData) {
  await setStatus(fd, "shortlisted");
}
export async function declineApplicant(fd: FormData) {
  await setStatus(fd, "rejected");
}
export async function unshortlistApplicant(fd: FormData) {
  await setStatus(fd, "submitted");
}
