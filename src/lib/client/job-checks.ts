import type { Job } from "@/lib/types";

/** What a job still needs before it can be published. Empty means ready. */
export function jobProblems(j: Pick<Job, "title" | "description" | "skills" | "budget_min" | "budget_max">): string[] {
  const out: string[] = [];
  if (j.title.trim().length < 5 || j.title === "Untitled job") out.push("Add a clear title.");
  if (j.description.trim().length < 40) out.push("Write at least a couple of sentences in the description.");
  if (!j.skills.length) out.push("Pick at least one skill.");
  if (!j.budget_min && !j.budget_max) out.push("Add a budget (a range is fine).");
  return out;
}
