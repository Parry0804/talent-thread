import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";

/** The signed-in user's profile, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Profile | null> => {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
  return (data as Profile) ?? null;
});

export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : role === "client" ? "/client" : "/designer";
}

/** Use at the top of server pages and actions. Redirects if not allowed. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.suspended) redirect("/suspended");
  if (roles.length && !roles.includes(viewer.role)) redirect(homeFor(viewer.role));
  return viewer;
}

/** Like requireRole, but also sends people who haven't finished onboarding there first. */
export async function requireOnboarded(...roles: Role[]): Promise<Profile> {
  const viewer = await requireRole(...roles);
  if (!viewer.onboarded && viewer.role !== "admin") redirect("/onboarding");
  return viewer;
}
