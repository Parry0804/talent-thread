"use server";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/client/data";
import { createServiceClient } from "@/lib/supabase/server";
import { audit, notify } from "@/lib/notify";
import type { ActionState } from "@/components/ui/action-form";

/** Billing isn't built yet: we record interest and tell the admins, nothing else. */
export async function registerGrowthInterest(): Promise<ActionState> {
  const { viewer, company } = await requireClient();
  if (company.plan === "growth") return { notice: "You're already on Growth." };
  const db = createServiceClient();
  const { count } = await db.from("audit_log").select("id", { count: "exact", head: true }).eq("actor_id", viewer.id).eq("action", "plan.growth_interest");
  if (count) return { notice: "You're already on the list. We'll let you know as soon as Growth billing opens." };

  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  const who = company.company_name ? `${company.company_name} (${viewer.full_name})` : viewer.full_name;
  for (const a of admins ?? []) {
    await notify(a.id as string, "growth_interest", "Client wants the Growth plan", `${who} asked to be told when Growth billing opens.`, `/admin/users`);
  }
  await audit(viewer.id, "plan.growth_interest", "client", viewer.id, { company: company.company_name });
  revalidatePath("/client/plan");
  return { notice: "Thanks! You're on the list. We'll notify you here the moment Growth billing opens, and your 14-day free trial will start then." };
}
