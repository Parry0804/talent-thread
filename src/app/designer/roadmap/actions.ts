"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createRoadmapFromReview } from "@/lib/designer-ai/roadmap";
import type { ReviewReport } from "@/lib/ai/rubric";

/** Ticks a roadmap task on or off. RLS only lets designers update their own tasks. */
export async function toggleTask(fd: FormData) {
  await requireOnboarded("designer");
  const supabase = await createClient();
  const id = String(fd.get("task_id") ?? "");
  const done = fd.get("done") === "1";
  if (id) await supabase.from("roadmap_tasks").update({ done }).eq("id", id);
  revalidatePath("/designer/roadmap");
}

/** Saves an optional proof link (Behance post, Figma file…) and marks the task done. */
export async function saveProof(fd: FormData) {
  await requireOnboarded("designer");
  const supabase = await createClient();
  const id = String(fd.get("task_id") ?? "");
  let url = String(fd.get("proof_url") ?? "").trim().slice(0, 500);
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (url) {
    try {
      new URL(url);
    } catch {
      url = "";
    }
  }
  if (id) await supabase.from("roadmap_tasks").update({ proof_url: url || null, ...(url ? { done: true } : {}) }).eq("id", id);
  revalidatePath("/designer/roadmap");
}

/** Builds a roadmap from the designer's latest finished review (if one wasn't made automatically). */
export async function buildFromLatestReview() {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const { data: review } = await supabase
    .from("ai_reviews")
    .select("id, report")
    .eq("designer_id", viewer.id)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (review?.report) {
    const { count } = await supabase.from("roadmaps").select("id", { count: "exact", head: true }).eq("review_id", review.id);
    if (!count) await createRoadmapFromReview(createServiceClient(), viewer.id, review.id, review.report as ReviewReport);
  }
  redirect("/designer/roadmap");
}
