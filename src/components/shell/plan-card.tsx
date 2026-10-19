import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FREE_REVIEWS_PER_MONTH } from "@/lib/ai/rubric";
import type { Profile } from "@/lib/types";

/** Sidebar card: free AI reviews left (designers) or plan status (clients). */
export async function PlanCard({ viewer }: { viewer: Profile }) {
  const supabase = await createClient();
  if (viewer.role === "designer") {
    const { data: dp } = await supabase.from("designer_profiles").select("plan").eq("id", viewer.id).single();
    if (dp?.plan === "pro") {
      return <div className="rounded-lg bg-ink-900 p-4 text-sm text-paper-50"><div className="font-semibold">Pro plan</div><div className="text-paper-300">Unlimited AI reviews</div></div>;
    }
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("ai_reviews")
      .select("id", { count: "exact", head: true })
      .eq("designer_id", viewer.id)
      .gte("created_at", monthStart)
      .neq("status", "failed");
    const used = Math.min(count ?? 0, FREE_REVIEWS_PER_MONTH);
    return (
      <div className="rounded-lg bg-marigold-50 p-4 text-sm">
        <div className="font-semibold text-ink-900">Free plan</div>
        <div className="mt-0.5 text-ink-600">{used} of {FREE_REVIEWS_PER_MONTH} AI reviews used this month</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-marigold-100">
          <div className="h-full bg-marigold-500" style={{ width: `${(used / FREE_REVIEWS_PER_MONTH) * 100}%` }} />
        </div>
        <Link href="/designer/upgrade" className="mt-2 inline-block font-medium text-violet-600 hover:underline">Upgrade to Pro · ₹499</Link>
      </div>
    );
  }
  const { data: cp } = await supabase.from("client_profiles").select("plan, trial_ends_at").eq("id", viewer.id).single();
  const growth = cp?.plan === "growth";
  return (
    <div className="rounded-lg bg-violet-50 p-4 text-sm">
      <div className="font-semibold text-ink-900">{growth ? "Growth plan" : "Starter plan"}</div>
      <div className="mt-0.5 text-ink-600">{growth ? "Unlimited jobs and AI talent picks" : "Post jobs free. Growth adds AI talent picks."}</div>
      <Link href="/client/plan" className="mt-2 inline-block font-medium text-violet-600 hover:underline">{growth ? "Manage plan" : "See Growth"}</Link>
    </div>
  );
}
