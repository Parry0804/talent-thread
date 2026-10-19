"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import type { Role } from "@/lib/types";

export type AuthState = { error?: string; notice?: string } | undefined;

/** The address this request came in on, so email and Google links return to the same site. */
async function siteUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithGoogle(fd: FormData) {
  const role: Role = fd.get("role") === "client" ? "client" : "designer";
  const nextRaw = String(fd.get("next") ?? "");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/onboarding";
  const supabase = await createClient();
  const params = new URLSearchParams({ next, role });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?${params}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const fullName = String(fd.get("full_name") ?? "").trim();
  const role = (fd.get("role") === "client" ? "client" : "designer") as Role;
  if (!fullName) return { error: "Please enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { notice: `We've sent a confirmation link to ${email}. Open it to continue.` };
  redirect("/onboarding");
}

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match. Try again or reset your password." };
  const { data: profile } = await supabase.from("profiles").select("role, onboarded").eq("id", data.user.id).single();
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  if (profile && !profile.onboarded && profile.role !== "admin") redirect("/onboarding");
  redirect(homeFor((profile?.role ?? "designer") as Role));
}

export async function requestReset(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });
  return { notice: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/login?reset=1");
}
