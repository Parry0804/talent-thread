"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { audit, notify } from "@/lib/notify";
import { daysAgoISO } from "@/lib/designer-ai/time";
import type { ActionState } from "@/components/ui/action-form";

/** Records that a designer wants Pro. Checkout isn't built yet, so admins follow up by hand. */
export async function requestPro(): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const db = createServiceClient();
  const { data: dp } = await db.from("designer_profiles").select("plan, slug").eq("id", viewer.id).single();
  if (dp?.plan === "pro") return { notice: "You're already on Pro." };

  const since = daysAgoISO(30);
  const { count } = await db.from("audit_log").select("id", { count: "exact", head: true }).eq("actor_id", viewer.id).eq("action", "pro_interest").gte("created_at", since);
  if (count) return { notice: "You're already on the list. We'll let you know as soon as Pro checkout opens." };

  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  const name = viewer.full_name || "A designer";
  await Promise.all(
    (admins ?? []).map((a) => notify(a.id as string, "pro_interest", `Designer ${name} wants Pro`, `${name}${viewer.city ? ` (${viewer.city})` : ""} asked to upgrade to Pro at ₹499/month.`, dp?.slug ? `/d/${dp.slug}` : undefined)),
  );
  await audit(viewer.id, "pro_interest", "designer_profiles", viewer.id);
  revalidatePath("/designer/upgrade");
  return { notice: "Thanks! You're on the list. We'll message you here as soon as Pro checkout opens. Nothing has been charged." };
}
