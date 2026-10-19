// Central place to read configuration. Pages call `isConfigured()` to show a
// setup notice instead of crashing when keys have not been added yet.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim(),
  anthropicKey: (process.env.ANTHROPIC_API_KEY ?? "").trim(),
  razorpayKeyId: (process.env.RAZORPAY_KEY_ID ?? "").trim(),
  razorpayKeySecret: (process.env.RAZORPAY_KEY_SECRET ?? "").trim(),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export function isConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function missingKeys(): string[] {
  const map: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: env.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: env.supabaseServiceKey,
    ANTHROPIC_API_KEY: env.anthropicKey,
    RAZORPAY_KEY_ID: env.razorpayKeyId,
    RAZORPAY_KEY_SECRET: env.razorpayKeySecret,
  };
  return Object.entries(map).filter(([, v]) => !v).map(([k]) => k);
}
