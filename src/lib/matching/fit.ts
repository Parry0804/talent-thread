// Deterministic job-fit scorer. Pure code (no AI), safe to import on client and server.
import type { DesignerProfile, Job } from "@/lib/types";

export type FitJob = Pick<Job, "skills" | "category" | "budget_min" | "budget_max" | "budget_type" | "timeline_weeks">;
export type FitDesigner = Pick<DesignerProfile, "skills" | "disciplines" | "hourly_rate" | "availability" | "latest_score">;
export interface FitResult {
  score: number;
  reasons: string[];
}

/** JOB_CATEGORIES → DISCIPLINES that suit them. */
export const CATEGORY_DISCIPLINES: Record<string, string[]> = {
  Branding: ["Brand & identity"],
  "UI/UX": ["UI / UX", "Web design"],
  Illustration: ["Illustration"],
  Motion: ["Motion"],
  Packaging: ["Packaging", "Brand & identity"],
  "Social media": ["Social & marketing", "Illustration"],
  "Web design": ["Web design", "UI / UX"],
  Print: ["Print", "Brand & identity"],
};

export const EMERGING_TALENT_CONTRACTS = 3;
export const EMERGING_TALENT_BOOST = 5;

const norm = (s: string) => s.trim().toLowerCase();

/** Rough hours a job of `weeks` represents, to compare fixed budgets with an hourly rate. */
function estimatedHours(weeks: number | null) {
  const w = weeks && weeks > 0 ? weeks : 2;
  return w * 20; // part-time freelance load
}

export function fitScore(job: FitJob, designer: FitDesigner, completedContracts: number): FitResult {
  const reasons: { text: string; weight: number }[] = [];

  // Skills: 0–40
  const jobSkills = (job.skills ?? []).map(norm);
  const mine = new Set((designer.skills ?? []).map(norm));
  let skillPts: number;
  if (jobSkills.length === 0) {
    skillPts = 24;
  } else {
    const matched = jobSkills.filter((s) => mine.has(s)).length;
    skillPts = Math.round((matched / jobSkills.length) * 40);
    if (matched > 0) reasons.push({ text: `${matched} of ${jobSkills.length} skills match`, weight: skillPts });
  }

  // Category vs disciplines: 0–20
  const wanted = CATEGORY_DISCIPLINES[job.category] ?? [];
  const disciplines = designer.disciplines ?? [];
  let catPts = 0;
  if (wanted[0] && disciplines.includes(wanted[0])) {
    catPts = 20;
    reasons.push({ text: `${job.category} is your discipline`, weight: catPts });
  } else if (wanted.some((d) => disciplines.includes(d))) {
    catPts = 12;
    reasons.push({ text: "Close to your disciplines", weight: catPts });
  }

  // Budget vs hourly rate: 0–20
  let budgetPts = 10;
  const rate = designer.hourly_rate;
  const top = job.budget_max || job.budget_min;
  if (rate && rate > 0 && top > 0) {
    const effectiveRate = job.budget_type === "hourly" ? top : top / estimatedHours(job.timeline_weeks);
    const ratio = effectiveRate / rate;
    if (ratio >= 0.9) {
      budgetPts = 20;
      reasons.push({ text: "Rate fits budget", weight: budgetPts });
    } else if (ratio >= 0.65) {
      budgetPts = 12;
      reasons.push({ text: "Budget slightly under your rate", weight: 4 });
    } else {
      budgetPts = 3;
    }
  }

  // Availability: 0–10
  const availPts = designer.availability === "available" ? 10 : designer.availability === "limited" ? 5 : 0;
  if (designer.availability === "available") reasons.push({ text: "You're available now", weight: 6 });

  // AI score, light weight: 0–10
  const s = designer.latest_score;
  const scorePts = s == null ? 4 : Math.round((Math.max(0, Math.min(100, s)) / 100) * 10);
  if (s != null && s >= 75) reasons.push({ text: `Strong portfolio score (${s})`, weight: scorePts });

  let total = skillPts + catPts + budgetPts + availPts + scorePts;
  if (completedContracts < EMERGING_TALENT_CONTRACTS) {
    total += EMERGING_TALENT_BOOST;
    reasons.push({ text: "Emerging talent boost", weight: 1 });
  }

  const score = Math.max(0, Math.min(100, Math.round(total)));
  return { score, reasons: reasons.sort((a, b) => b.weight - a.weight).map((r) => r.text) };
}
