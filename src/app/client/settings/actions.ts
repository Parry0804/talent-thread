"use server";
import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/client/data";
import { GSTIN_PATTERN } from "@/lib/client/gst";
import { BUDGETS, CITIES, COMPANY_SIZES, INDUSTRIES, JOB_CATEGORIES } from "@/lib/options";
import type { ActionState } from "@/components/ui/action-form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const pick = (v: string, list: string[]) => (list.includes(v) ? v : null);

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const { viewer, supabase } = await requireClient();
  const fullName = str(fd, "full_name");
  const company = str(fd, "company_name");
  const gstin = str(fd, "gstin").toUpperCase().replace(/\s+/g, "");
  let website = str(fd, "website");
  if (!fullName) return { error: "Please add your name." };
  if (!company) return { error: "Please add your company or brand name." };
  if (gstin && !GSTIN_PATTERN.test(gstin)) return { error: "That GSTIN doesn't look right. It should be 15 characters, like 27ABCDE1234F1Z5." };
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(website)) return { error: "That website address doesn't look right." };

  const { error: e1 } = await supabase
    .from("profiles")
    .update({ full_name: fullName.slice(0, 80), city: pick(str(fd, "city"), CITIES) })
    .eq("id", viewer.id);
  const { error: e2 } = await supabase
    .from("client_profiles")
    .update({
      company_name: company.slice(0, 120),
      company_size: pick(str(fd, "company_size"), COMPANY_SIZES),
      industry: pick(str(fd, "industry"), INDUSTRIES),
      website: website.slice(0, 200) || null,
      gstin: gstin || null,
      needs: fd.getAll("needs").map(String).filter((n) => JOB_CATEGORIES.includes(n)),
      typical_budget: pick(str(fd, "typical_budget"), BUDGETS),
    })
    .eq("id", viewer.id);
  if (e1 || e2) return { error: "We couldn't save that. Please try again." };
  revalidatePath("/client", "layout");
  return { notice: "Saved. New invoices will use these details." };
}
