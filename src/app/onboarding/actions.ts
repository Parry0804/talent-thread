"use server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";

export type OnboardState = { error?: string } | undefined;

const list = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);

export async function saveDesignerOnboarding(_: OnboardState, fd: FormData): Promise<OnboardState> {
  const viewer = await requireRole("designer");
  const supabase = await createClient();
  const skills = list(fd, "skills");
  const disciplines = list(fd, "disciplines");
  if (!disciplines.length) return { error: "Pick at least one discipline." };
  if (skills.length < 2) return { error: "Pick at least two skills so we can match you to jobs." };
  const rate = Number(fd.get("hourly_rate") || 0);
  const headline = String(fd.get("headline") ?? "").trim();

  const { error: e1 } = await supabase
    .from("profiles")
    .update({ full_name: String(fd.get("full_name") ?? viewer.full_name).trim(), city: String(fd.get("city") ?? "") || null, onboarded: true })
    .eq("id", viewer.id);
  const { error: e2 } = await supabase
    .from("designer_profiles")
    .update({
      slug: `${slugify(viewer.full_name || "designer")}-${viewer.id.slice(0, 6)}`,
      headline,
      disciplines,
      skills,
      tools: list(fd, "tools"),
      languages: list(fd, "languages"),
      years_experience: Number(fd.get("years_experience") || 0),
      hourly_rate: rate > 0 ? rate : null,
      availability: (String(fd.get("availability") || "available")) as "available",
      links: { behance: String(fd.get("behance") ?? ""), dribbble: String(fd.get("dribbble") ?? ""), website: String(fd.get("website") ?? "") },
    })
    .eq("id", viewer.id);
  if (e1 || e2) return { error: "We couldn't save that. Please try again." };
  redirect("/designer?welcome=1");
}

export async function saveClientOnboarding(_: OnboardState, fd: FormData): Promise<OnboardState> {
  const viewer = await requireRole("client");
  const supabase = await createClient();
  const company = String(fd.get("company_name") ?? "").trim();
  if (!company) return { error: "Please add your company or brand name." };
  const { error: e1 } = await supabase
    .from("profiles")
    .update({ full_name: String(fd.get("full_name") ?? viewer.full_name).trim(), city: String(fd.get("city") ?? "") || null, onboarded: true })
    .eq("id", viewer.id);
  const { error: e2 } = await supabase
    .from("client_profiles")
    .update({
      company_name: company,
      company_size: String(fd.get("company_size") ?? "") || null,
      industry: String(fd.get("industry") ?? "") || null,
      website: String(fd.get("website") ?? "") || null,
      gstin: String(fd.get("gstin") ?? "").toUpperCase() || null,
      needs: list(fd, "needs"),
      typical_budget: String(fd.get("typical_budget") ?? "") || null,
    })
    .eq("id", viewer.id);
  if (e1 || e2) return { error: "We couldn't save that. Please try again." };
  redirect("/client?welcome=1");
}
