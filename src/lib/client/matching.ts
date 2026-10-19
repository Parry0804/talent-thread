import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fitScore } from "@/lib/matching/fit";
import { completedContractCounts, loadDesigners, portfolioThumbs, type DesignerSummary } from "@/lib/client/data";
import type { DesignerProfile, Job } from "@/lib/types";

export const EMERGING_CONTRACTS = 3;

/** fitScore reasons are written for designers ("You're available now"); reword them for the client. */
export function clientReason(r: string) {
  return r
    .replace(/^You're available now$/, "Available now")
    .replace(/^(.+) is your discipline$/, "Works in $1")
    .replace(/your rate/g, "their rate")
    .replace(/^Strong portfolio score/, "Strong AI portfolio score")
    .replace(/\byou\b/gi, "they")
    .replace(/\byour\b/gi, "their");
}

export interface RankedDesigner extends DesignerSummary {
  fit: number;
  reasons: string[];
  completed: number;
  thumbs: string[];
}

/** Top designers for a job by fitScore. Skips unavailable, suspended and not-yet-onboarded designers. */
export async function rankDesignersForJob(job: Job, limit: number, exclude: string[] = []): Promise<RankedDesigner[]> {
  const supabase = await createClient();
  const base = () =>
    supabase.from("designer_profiles").select("id").neq("availability", "unavailable").order("latest_score", { ascending: false, nullsFirst: false });
  // Designers sharing at least one skill first, topped up with the best-scored others.
  const [{ data: overlap }, { data: rest }] = await Promise.all([
    job.skills.length ? base().overlaps("skills", job.skills).limit(150) : Promise.resolve({ data: [] as { id: string }[] }),
    base().limit(60),
  ]);
  const ids = [...new Set([...(overlap ?? []), ...(rest ?? [])].map((r) => r.id as string))].filter((id) => !exclude.includes(id));
  if (!ids.length) return [];

  const { data: people } = await supabase.from("profiles").select("id").in("id", ids).eq("onboarded", true).eq("suspended", false).eq("role", "designer");
  const ok = (people ?? []).map((p) => p.id as string);
  const [designers, counts] = await Promise.all([loadDesigners(ok), completedContractCounts(ok)]);

  const ranked = [...designers.values()]
    .map((d) => {
      const completed = counts.get(d.id) ?? 0;
      const r = fitScore(job, d.profile as DesignerProfile, completed);
      return { ...d, fit: r.score, reasons: r.reasons.map(clientReason), completed, thumbs: [] as string[] };
    })
    .sort((a, b) => b.fit - a.fit)
    .slice(0, limit);

  const thumbs = await portfolioThumbs(ranked.map((r) => r.id));
  for (const r of ranked) r.thumbs = thumbs.get(r.id) ?? [];
  return ranked;
}
