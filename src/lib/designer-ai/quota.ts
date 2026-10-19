import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { FREE_REVIEWS_PER_MONTH } from "@/lib/ai/rubric";

/** A review still "running" after this long has almost certainly died with its request. */
const STALE_MINUTES = 10;

export function monthStartISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/** Marks this designer's stuck reviews as failed so they stop counting toward the quota. */
export async function expireStaleReviews(designerId: string) {
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  await db
    .from("ai_reviews")
    .update({ status: "failed", error: "This review stopped before it finished. It doesn't count toward your free reviews, so please run it again." })
    .eq("designer_id", designerId)
    .in("status", ["queued", "running"])
    .lt("created_at", cutoff);
}

export interface Quota {
  plan: "free" | "pro";
  used: number;
  limit: number | null; // null = unlimited
  remaining: number | null;
  blocked: boolean;
}

/** Reviews used this month (failed ones don't count). Works with either client. */
export async function getQuota(db: SupabaseClient, designerId: string): Promise<Quota> {
  const [{ data: dp }, { count }] = await Promise.all([
    db.from("designer_profiles").select("plan").eq("id", designerId).single(),
    db
      .from("ai_reviews")
      .select("id", { count: "exact", head: true })
      .eq("designer_id", designerId)
      .gte("created_at", monthStartISO())
      .neq("status", "failed"),
  ]);
  const plan = dp?.plan === "pro" ? "pro" : "free";
  const used = count ?? 0;
  if (plan === "pro") return { plan, used, limit: null, remaining: null, blocked: false };
  const remaining = Math.max(0, FREE_REVIEWS_PER_MONTH - used);
  return { plan, used, limit: FREE_REVIEWS_PER_MONTH, remaining, blocked: remaining === 0 };
}
