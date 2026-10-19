"use server";
import { redirect } from "next/navigation";
import { findOwnedJob, requireClient } from "@/lib/client/data";
import { jobProblems } from "@/lib/client/job-checks";
import { audit } from "@/lib/notify";
import type { ActionState } from "@/components/ui/action-form";

export async function publishJob(_: ActionState, fd: FormData): Promise<ActionState> {
  const { viewer, supabase } = await requireClient();
  const job = await findOwnedJob(String(fd.get("id") ?? ""), viewer.id);
  if (!job) return { error: "We couldn't find that job." };
  if (job.status === "open") redirect(`/client/jobs/${job.id}/published`);
  if (job.status === "filled") return { error: "This job is already filled." };
  const problems = jobProblems(job);
  if (problems.length) return { error: problems.join(" ") };

  const { error } = await supabase
    .from("jobs")
    .update({ status: "open", published_at: job.published_at ?? new Date().toISOString() })
    .eq("id", job.id)
    .eq("client_id", viewer.id);
  if (error) return { error: "We couldn't publish the job. Please try again." };
  await audit(viewer.id, "job.published", "job", job.id);
  redirect(`/client/jobs/${job.id}/published`);
}
