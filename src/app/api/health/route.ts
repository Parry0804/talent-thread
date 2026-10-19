import { env } from "@/lib/env";

// Reports which settings this deployment can see (yes/no only, never the values),
// so a missing or misnamed key can be spotted without opening the dashboard.
export function GET() {
  const set = (v: string) => Boolean(v);
  return Response.json({
    supabaseUrl: set(env.supabaseUrl),
    supabaseUrlLooksRight: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.supabaseUrl),
    supabasePublicKey: set(env.supabaseAnonKey),
    supabaseSecretKey: set(env.supabaseServiceKey),
    anthropicKey: set(env.anthropicKey),
    razorpayKeys: set(env.razorpayKeyId) && set(env.razorpayKeySecret),
    razorpayWebhookSecret: set(process.env.RAZORPAY_WEBHOOK_SECRET ?? ""),
    cronSecret: set(process.env.CRON_SECRET ?? ""),
    vercelEnv: process.env.VERCEL_ENV ?? "local",
  });
}
