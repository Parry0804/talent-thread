import type { DesignerProfile, Profile } from "@/lib/types";

/** What counts toward a complete designer profile, in the order we suggest fixing it. */
export function profileCompleteness(p: Pick<Profile, "full_name" | "avatar_url" | "city">, d: DesignerProfile, portfolioCount: number, payoutUpi: string | null) {
  const links = Object.values(d.links ?? {}).filter(Boolean).length;
  const items: { label: string; done: boolean }[] = [
    { label: "Add a profile photo", done: Boolean(p.avatar_url) },
    { label: "Write a one-line headline", done: d.headline.trim().length >= 10 },
    { label: "Write a short bio (at least 2 lines)", done: d.bio.trim().length >= 80 },
    { label: "Pick your disciplines", done: d.disciplines.length > 0 },
    { label: "Pick at least 3 skills", done: d.skills.length >= 3 },
    { label: "Add the tools you use", done: d.tools.length > 0 },
    { label: "Set an hourly rate", done: Boolean(d.hourly_rate) },
    { label: "Add your city", done: Boolean(p.city) },
    { label: "Add a Behance, Dribbble or website link", done: links > 0 },
    { label: "Add at least 3 portfolio pieces", done: portfolioCount >= 3 },
    { label: "Add a UPI ID for payouts", done: Boolean(payoutUpi) },
  ];
  const done = items.filter((i) => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}

export const LINK_FIELDS = [
  { key: "behance", label: "Behance", placeholder: "behance.net/yourname" },
  { key: "dribbble", label: "Dribbble", placeholder: "dribbble.com/yourname" },
  { key: "website", label: "Website", placeholder: "yourname.in" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/yourname" },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/yourname" },
] as const;

/** Turns "behance.net/x" into "https://behance.net/x" for links. */
export function hrefFor(url: string) {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
