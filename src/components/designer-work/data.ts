import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export interface JobExtras {
  company: Record<string, string>;
  applicants: Record<string, number>;
}

/** Company names (RLS allows reading client profiles) and applicant counts (counted with the service client, ids only). */
export async function jobExtras(jobs: Pick<Job, "id" | "client_id">[]): Promise<JobExtras> {
  const company: Record<string, string> = {};
  const applicants: Record<string, number> = {};
  if (!jobs.length) return { company, applicants };
  const supabase = await createClient();
  const clientIds = [...new Set(jobs.map((j) => j.client_id))];
  const jobIds = jobs.map((j) => j.id);
  const [{ data: clients }, { data: apps }] = await Promise.all([
    supabase.from("client_profiles").select("id, company_name").in("id", clientIds),
    createServiceClient().from("applications").select("job_id").in("job_id", jobIds).neq("status", "withdrawn"),
  ]);
  for (const c of clients ?? []) company[c.id] = c.company_name || "A Talent Thread client";
  for (const a of apps ?? []) applicants[a.job_id] = (applicants[a.job_id] ?? 0) + 1;
  return { company, applicants };
}

/** Start of the Indian financial year (1 April) containing `d`. */
export function fyStart(d = new Date()) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(y, 3, 1);
}

export function fyLabel(d = new Date()) {
  const s = fyStart(d).getFullYear();
  return `FY ${s}–${String(s + 1).slice(2)}`;
}
