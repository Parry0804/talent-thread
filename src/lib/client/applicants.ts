import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fitScore } from "@/lib/matching/fit";
import { completedContractCounts, loadDesigners, type DesignerSummary } from "@/lib/client/data";
import { clientReason } from "@/lib/client/matching";
import type { Application, Job } from "@/lib/types";

export interface RankedApplicant {
  app: Application;
  designer: DesignerSummary | null;
  fit: number;
  reasons: string[];
  completed: number;
}

/** Applicants for a job ranked by fit (stored at insert time, computed if missing). Withdrawn ones are left out. */
export async function rankedApplicants(job: Job): Promise<RankedApplicant[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("*").eq("job_id", job.id).neq("status", "withdrawn");
  const apps = (data ?? []) as Application[];
  const ids = apps.map((a) => a.designer_id);
  const [designers, counts] = await Promise.all([loadDesigners(ids), completedContractCounts(ids)]);
  return apps
    .map((app) => {
      const designer = designers.get(app.designer_id) ?? null;
      const completed = counts.get(app.designer_id) ?? 0;
      let fit = app.fit_score;
      let reasons = app.fit_reasons ?? [];
      if (fit == null && designer) {
        const r = fitScore(job, designer.profile, completed);
        fit = r.score;
        reasons = r.reasons;
      }
      return { app, designer, fit: fit ?? 0, reasons: reasons.map(clientReason), completed };
    })
    .sort((a, b) => Number(a.app.status === "rejected") - Number(b.app.status === "rejected") || b.fit - a.fit || a.app.created_at.localeCompare(b.app.created_at));
}
