"use server";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/client/data";
import { draftJobBrief, ReviewError } from "@/lib/ai/review";
import { JOB_CATEGORIES } from "@/lib/options";
import type { ActionState } from "@/components/ui/action-form";

const int = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));

export async function writeBriefWithAI(_: ActionState, fd: FormData): Promise<ActionState> {
  const { viewer, company, supabase } = await requireClient();
  const text = String(fd.get("description") ?? "").trim();
  if (text.length < 30) return { error: "Tell us a little more — a few sentences about what you need, who it's for and when you need it." };
  if (text.length > 6000) return { error: "That's quite long. Please keep it under 6,000 characters." };

  let brief;
  try {
    brief = await draftJobBrief(text, company.company_name);
  } catch (e) {
    if (e instanceof ReviewError) return { error: e.message };
    console.error("draftJobBrief failed", e);
    return { error: "The AI brief builder isn't available right now. You can still write the brief yourself." };
  }

  let min = int(brief.budget_min);
  let max = int(brief.budget_max);
  if (max < min) [min, max] = [max, min];
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      client_id: viewer.id,
      status: "draft",
      title: brief.title.trim().slice(0, 120) || "Untitled job",
      category: JOB_CATEGORIES.includes(brief.category) ? brief.category : "Branding",
      description: brief.description.trim(),
      deliverables: brief.deliverables.map((d) => d.trim()).filter(Boolean).slice(0, 20),
      skills: [...new Set(brief.skills.map((s) => s.trim()).filter(Boolean))].slice(0, 15),
      budget_type: "fixed",
      budget_min: min,
      budget_max: max,
      timeline_weeks: brief.timeline_weeks > 0 ? Math.min(52, brief.timeline_weeks) : null,
      experience_level: brief.experience_level,
      brief: { ...brief, source_text: text },
    })
    .select("id")
    .single();
  if (error || !data) return { error: "We drafted the brief but couldn't save it. Please try again." };
  redirect(`/client/jobs/${data.id}/edit?drafted=1`);
}

export async function startBlankJob(): Promise<void> {
  const { viewer, supabase } = await requireClient();
  const { data } = await supabase
    .from("jobs")
    .insert({ client_id: viewer.id, status: "draft", title: "Untitled job" })
    .select("id")
    .single();
  if (!data) redirect("/client/jobs?error=1");
  redirect(`/client/jobs/${data.id}/edit`);
}
