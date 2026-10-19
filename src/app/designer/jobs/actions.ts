"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFitContext } from "@/lib/matching/context";
import { notify } from "@/lib/notify";
import { formatINR } from "@/lib/money";
import type { ActionState } from "@/components/ui/action-form";

const UUID = /^[0-9a-f-]{36}$/i;

export async function toggleSaveJob(fd: FormData) {
  const viewer = await requireOnboarded("designer");
  const jobId = String(fd.get("job_id") ?? "");
  if (!UUID.test(jobId)) return;
  const supabase = await createClient();
  if (fd.get("saved") === "1") {
    await supabase.from("saved_jobs").delete().eq("designer_id", viewer.id).eq("job_id", jobId);
  } else {
    await supabase.from("saved_jobs").upsert({ designer_id: viewer.id, job_id: jobId }, { onConflict: "designer_id,job_id", ignoreDuplicates: true });
  }
  revalidatePath("/designer/jobs");
  revalidatePath(`/designer/jobs/${jobId}`);
  revalidatePath("/designer");
}

export async function applyToJob(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const jobId = String(fd.get("job_id") ?? "");
  if (!UUID.test(jobId)) return { error: "That job couldn't be found." };

  const cover = String(fd.get("cover_letter") ?? "").trim();
  const amount = Math.round(Number(fd.get("proposed_amount") || 0));
  const daysRaw = Number(fd.get("timeline_days") || 0);
  const itemIds = [...new Set(fd.getAll("portfolio_item_ids").map(String).filter((v) => UUID.test(v)))];

  if (cover.length < 80) return { error: "Your cover letter is a little short. Add a few lines on how you'd approach this brief (at least 80 characters)." };
  if (cover.length > 5000) return { error: "Please keep your cover letter under 5,000 characters." };
  if (!Number.isFinite(amount) || amount < 1) return { error: "Enter the amount you're proposing, in rupees." };
  if (amount > 10_000_000) return { error: "That amount looks too large. Please check it." };
  const timeline = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(365, Math.round(daysRaw)) : null;
  if (!timeline) return { error: "Tell the client how many days you need." };
  if (itemIds.length < 1 || itemIds.length > 3) return { error: "Attach between 1 and 3 portfolio pieces." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_id, title, status, skills, category, budget_min, budget_max, budget_type, timeline_weeks")
    .eq("id", jobId)
    .single();
  if (!job) return { error: "That job couldn't be found." };
  if (job.status !== "open") return { error: "This job is no longer taking applications." };

  const { data: items } = await supabase.from("portfolio_items").select("id").eq("designer_id", viewer.id).in("id", itemIds);
  if ((items ?? []).length !== itemIds.length) return { error: "One of those portfolio pieces isn't yours. Please pick again." };

  const ctx = await loadFitContext(viewer.id);
  const fit = ctx.score(job);

  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    designer_id: viewer.id,
    cover_letter: cover,
    proposed_amount: amount,
    timeline_days: timeline,
    portfolio_item_ids: itemIds,
    status: "submitted",
    fit_score: fit.score,
    fit_reasons: fit.reasons.slice(0, 5),
  });
  if (error) {
    if (error.code === "23505") redirect(`/designer/jobs/${jobId}`);
    return { error: "We couldn't send your application. Please try again." };
  }

  await notify(
    job.client_id,
    "application",
    `New application for “${job.title}”`,
    `${viewer.full_name || "A designer"} proposed ${formatINR(amount)} over ${timeline} days · ${fit.score}% fit`,
    `/client/jobs/${jobId}/applicants`,
  );
  revalidatePath("/designer/applications");
  revalidatePath("/designer");
  redirect(`/designer/jobs/${jobId}?applied=1`);
}
