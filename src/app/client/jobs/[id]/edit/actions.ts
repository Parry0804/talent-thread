"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findOwnedJob, requireClient } from "@/lib/client/data";
import { JOB_CATEGORIES } from "@/lib/options";
import { EXPERIENCE_LEVELS } from "@/lib/client/options";
import { jobProblems } from "@/lib/client/job-checks";
import type { ActionState } from "@/components/ui/action-form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string) => {
  const n = Math.round(Number(fd.get(k) || 0));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100_000_000) : 0;
};

/** Saves whatever is filled in (so nothing typed is lost), then checks it's ready before previewing. */
export async function saveJob(_: ActionState, fd: FormData): Promise<ActionState> {
  const { viewer, supabase } = await requireClient();
  const id = str(fd, "id");
  const job = await findOwnedJob(id, viewer.id);
  if (!job) return { error: "We couldn't find that job." };
  if (job.status === "filled") return { error: "This job is filled, so it can't be edited." };

  const category = str(fd, "category");
  const min = int(fd, "budget_min");
  const max = Math.max(min, int(fd, "budget_max"));
  const weeks = Math.min(104, int(fd, "timeline_weeks"));
  const deliverables = str(fd, "deliverables").split("\n").map((d) => d.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).slice(0, 20);
  const extra = str(fd, "extra_skills").split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean);
  const skills = [...new Set([...fd.getAll("skills").map(String), ...extra])].slice(0, 15);
  const attachments = fd.getAll("attachments").map(String).filter((p) => p.startsWith(`${viewer.id}/`)).slice(0, 8);
  const experience = str(fd, "experience_level");

  const update = {
    title: str(fd, "title").slice(0, 120) || "Untitled job",
    category: JOB_CATEGORIES.includes(category) ? category : job.category,
    description: str(fd, "description").slice(0, 10000),
    deliverables,
    skills,
    budget_type: str(fd, "budget_type") === "hourly" ? ("hourly" as const) : ("fixed" as const),
    budget_min: min,
    budget_max: max,
    timeline_weeks: weeks || null,
    experience_level: EXPERIENCE_LEVELS.includes(experience) ? experience : null,
    location_pref: str(fd, "location_pref").slice(0, 80) || null,
    attachment_paths: attachments,
  };
  const { error } = await supabase.from("jobs").update(update).eq("id", job.id).eq("client_id", viewer.id);
  if (error) return { error: "We couldn't save your changes. Please try again." };

  revalidatePath(`/client/jobs/${job.id}/edit`);
  revalidatePath(`/client/jobs/${job.id}/preview`);
  if (str(fd, "intent") === "save") return { notice: "Saved. Come back any time to finish it." };

  const problems = jobProblems(update);
  if (problems.length) return { error: `Saved, but a few things are missing before you can preview: ${problems.join(" ")}` };
  redirect(`/client/jobs/${job.id}/preview`);
}
