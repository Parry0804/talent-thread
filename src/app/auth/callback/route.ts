import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Email confirmation, password-reset and Google sign-in links land here with a one-time code.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/onboarding";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/onboarding";
  // Supabase sends the reason back when it refuses a sign-in (for example a blocked redirect).
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return failed(url, providerError);
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("auth callback: code exchange failed", error.code, error.message);
      return failed(url, error.message);
    }
    // Google can't pass the designer/client choice at signup, so apply it here,
    // only for accounts that haven't finished onboarding yet.
    if (url.searchParams.get("role") === "client" && data.user) await makeClient(data.user.id);
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return failed(url, "No sign-in code was received.");
}

function failed(url: URL, reason: string) {
  const to = new URL("/login", url.origin);
  to.searchParams.set("error", "link");
  to.searchParams.set("reason", reason.slice(0, 200));
  return NextResponse.redirect(to);
}

async function makeClient(userId: string) {
  const db = createServiceClient();
  const { data: profile } = await db.from("profiles").select("role, onboarded").eq("id", userId).single();
  if (!profile || profile.onboarded || profile.role !== "designer") return;
  await db.from("client_profiles").upsert({ id: userId, plan: "starter" }, { onConflict: "id", ignoreDuplicates: true });
  await db.from("profiles").update({ role: "client" }).eq("id", userId);
  await db.from("designer_profiles").delete().eq("id", userId);
}
