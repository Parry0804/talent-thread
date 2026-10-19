"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { slugify } from "@/lib/format";
import { DISCIPLINES, LANGUAGES, SKILLS, TOOLS } from "@/lib/options";
import { LINK_FIELDS } from "@/lib/designer-ai/profile";
import type { ActionState } from "@/components/ui/action-form";

const pick = (fd: FormData, k: string, allowed: string[]) => [...new Set(fd.getAll(k).map(String).filter((v) => allowed.includes(v)))];
const extra = (fd: FormData, k: string) =>
  String(fd.get(k) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((s) => s.slice(0, 40));

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();

  const full_name = String(fd.get("full_name") ?? "").trim().slice(0, 80);
  if (!full_name) return { error: "Please add your name." };
  const headline = String(fd.get("headline") ?? "").trim().slice(0, 90);
  const bio = String(fd.get("bio") ?? "").trim().slice(0, 2000);
  const disciplines = pick(fd, "disciplines", DISCIPLINES);
  if (!disciplines.length) return { error: "Pick at least one discipline." };
  const skills = [...new Set([...pick(fd, "skills", SKILLS), ...extra(fd, "skills_extra")])];
  const tools = [...new Set([...pick(fd, "tools", TOOLS), ...extra(fd, "tools_extra")])];
  const languages = pick(fd, "languages", LANGUAGES);
  const years = Math.max(0, Math.min(60, Math.round(Number(fd.get("years_experience") || 0))));
  const rateRaw = String(fd.get("hourly_rate") ?? "").trim();
  const rate = rateRaw ? Math.round(Number(rateRaw)) : null;
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100000)) return { error: "Hourly rate should be between ₹0 and ₹1,00,000." };
  const availability = String(fd.get("availability") ?? "available");
  if (!["available", "limited", "unavailable"].includes(availability)) return { error: "Pick your availability." };

  const links: Record<string, string> = {};
  for (const l of LINK_FIELDS) {
    const v = String(fd.get(`link_${l.key}`) ?? "").trim().slice(0, 300);
    if (v) links[l.key] = v;
  }

  const upi = String(fd.get("payout_upi") ?? "").trim().toLowerCase();
  if (upi && !/^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-]{1,63}$/.test(upi)) return { error: "That UPI ID doesn't look right. It should look like yourname@okhdfcbank." };
  const pan = String(fd.get("pan_last4") ?? "").trim().toUpperCase();
  if (pan && !/^[0-9]{3}[A-Z]$/.test(pan)) return { error: "Enter the last 4 characters of your PAN: 3 digits and a letter, like 1234F → 234F." };

  // Only accept avatar URLs from our own avatars bucket, in the user's folder.
  const avatarRaw = String(fd.get("avatar_url") ?? "").trim();
  const avatarPrefix = `${env.supabaseUrl}/storage/v1/object/public/avatars/${viewer.id}/`;
  const avatar_url = avatarRaw && avatarRaw.startsWith(avatarPrefix) ? avatarRaw : avatarRaw ? viewer.avatar_url : null;

  const { data: current } = await supabase.from("designer_profiles").select("slug").eq("id", viewer.id).single();

  const { error: e1 } = await supabase
    .from("profiles")
    .update({ full_name, city: String(fd.get("city") ?? "") || null, avatar_url })
    .eq("id", viewer.id);
  const { error: e2 } = await supabase
    .from("designer_profiles")
    .update({
      slug: current?.slug || `${slugify(full_name || "designer")}-${viewer.id.slice(0, 6)}`,
      headline,
      bio,
      disciplines,
      skills,
      tools,
      languages,
      years_experience: years,
      hourly_rate: rate && rate > 0 ? rate : null,
      availability,
      links,
    })
    .eq("id", viewer.id);
  const { error: e3 } = await supabase
    .from("designer_payout")
    .upsert({ id: viewer.id, payout_upi: upi || null, pan_last4: pan || null, updated_at: new Date().toISOString() });
  if (e1 || e2 || e3) return { error: "We couldn't save your profile. Please try again." };
  revalidatePath("/designer", "layout");
  if (current?.slug) revalidatePath(`/d/${current.slug}`);
  return { notice: "Profile saved." };
}
