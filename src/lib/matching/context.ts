import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fitScore, type FitDesigner, type FitJob, type FitResult } from "@/lib/matching/fit";
import type { DesignerProfile } from "@/lib/types";

export interface DesignerFitContext {
  designer: DesignerProfile;
  completedContracts: number;
  score: (job: FitJob) => FitResult;
}

const EMPTY: FitDesigner = { skills: [], disciplines: [], hourly_rate: null, availability: "available", latest_score: null };

/** Loads the signed-in designer's profile and completed-contract count once, for scoring many jobs. */
export async function loadFitContext(designerId: string): Promise<DesignerFitContext> {
  const supabase = await createClient();
  const [{ data: dp }, { count }] = await Promise.all([
    supabase.from("designer_profiles").select("*").eq("id", designerId).single(),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("designer_id", designerId).eq("status", "completed"),
  ]);
  const designer = (dp as DesignerProfile) ?? ({ ...EMPTY, id: designerId } as DesignerProfile);
  const completedContracts = count ?? 0;
  return { designer, completedContracts, score: (job) => fitScore(job, designer, completedContracts) };
}
