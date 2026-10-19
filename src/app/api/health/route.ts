import { env, isConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Reports which settings this deployment can see and whether the database is set up
// (yes/no only, never values or data), so problems can be spotted without the dashboard.
export async function GET() {
  const set = (v: string) => Boolean(v);
  let databaseTables: boolean | string = "not checked";
  let storageBuckets: boolean | string = "not checked";
  if (isConfigured() && env.supabaseServiceKey) {
    const db = createServiceClient();
    const { error } = await db.from("profiles").select("id", { count: "exact", head: true });
    databaseTables = error ? `missing (${error.code ?? error.message})` : true;
    const { data: buckets, error: bErr } = await db.storage.listBuckets();
    storageBuckets = bErr ? `error (${bErr.message})` : ["portfolio", "avatars", "deliverables", "job-files"].every((b) => buckets?.some((x) => x.id === b));
  }
  return Response.json({
    supabaseUrl: set(env.supabaseUrl),
    supabaseUrlLooksRight: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.supabaseUrl),
    supabasePublicKey: set(env.supabaseAnonKey),
    supabaseSecretKey: set(env.supabaseServiceKey),
    databaseTables,
    storageBuckets,
    anthropicKey: set(env.anthropicKey),
    razorpayKeys: set(env.razorpayKeyId) && set(env.razorpayKeySecret),
    razorpayWebhookSecret: set(process.env.RAZORPAY_WEBHOOK_SECRET ?? ""),
    cronSecret: set(process.env.CRON_SECRET ?? ""),
    vercelEnv: process.env.VERCEL_ENV ?? "local",
  });
}
