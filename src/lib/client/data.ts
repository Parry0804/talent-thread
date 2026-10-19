import "server-only";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/storage";
import type { ClientProfile, DesignerProfile, Job, Profile } from "@/lib/types";

/** Signed-in client plus their company row. Use at the top of every client page and action. */
export async function requireClient() {
  const viewer = await requireOnboarded("client");
  const supabase = await createClient();
  const { data } = await supabase.from("client_profiles").select("*").eq("id", viewer.id).single();
  const company = (data as ClientProfile | null) ?? ({ id: viewer.id, company_name: "", plan: "starter", needs: [] } as unknown as ClientProfile);
  return { viewer, company, supabase };
}

/** A job the signed-in client owns, or a 404. */
export async function getOwnedJob(jobId: string, clientId: string): Promise<Job> {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).eq("client_id", clientId).maybeSingle();
  if (!data) notFound();
  return data as Job;
}

/** Same as getOwnedJob but returns null instead of 404 (for actions). */
export async function findOwnedJob(jobId: string, clientId: string): Promise<Job | null> {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).eq("client_id", clientId).maybeSingle();
  return (data as Job) ?? null;
}

export interface DesignerSummary {
  id: string;
  name: string;
  avatar: string | null;
  city: string | null;
  profile: DesignerProfile;
}

/** Profiles + designer rows for a set of designer ids, keyed by id. */
export async function loadDesigners(ids: string[]): Promise<Map<string, DesignerSummary>> {
  const out = new Map<string, DesignerSummary>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return out;
  const supabase = await createClient();
  const [{ data: people }, { data: designers }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, city").in("id", unique),
    supabase.from("designer_profiles").select("*").in("id", unique),
  ]);
  const byId = new Map((people ?? []).map((p) => [p.id as string, p as Pick<Profile, "id" | "full_name" | "avatar_url" | "city">]));
  for (const d of (designers ?? []) as DesignerProfile[]) {
    const p = byId.get(d.id);
    out.set(d.id, {
      id: d.id,
      name: p?.full_name || "Designer",
      avatar: publicUrl("avatars", p?.avatar_url),
      city: p?.city ?? null,
      profile: d,
    });
  }
  return out;
}

/**
 * Completed-contract counts per designer. Contracts are private to their two
 * parties, so this aggregate uses the service client; it returns counts only.
 */
export async function completedContractCounts(designerIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const unique = [...new Set(designerIds.filter(Boolean))];
  if (!unique.length) return counts;
  const db = createServiceClient();
  const { data } = await db.from("contracts").select("designer_id").eq("status", "completed").in("designer_id", unique);
  for (const r of data ?? []) counts.set(r.designer_id as string, (counts.get(r.designer_id as string) ?? 0) + 1);
  return counts;
}

/** First three portfolio image URLs per designer. */
export async function portfolioThumbs(designerIds: string[], perDesigner = 3): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const unique = [...new Set(designerIds.filter(Boolean))];
  if (!unique.length) return out;
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("designer_id, image_paths, sort")
    .in("designer_id", unique)
    .order("sort", { ascending: true });
  for (const item of data ?? []) {
    const list = out.get(item.designer_id as string) ?? [];
    for (const path of (item.image_paths as string[]) ?? []) {
      if (list.length >= perDesigner) break;
      const url = publicUrl("portfolio", path);
      if (url) list.push(url);
    }
    out.set(item.designer_id as string, list);
  }
  return out;
}

export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
