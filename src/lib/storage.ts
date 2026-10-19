import { env } from "@/lib/env";

/** Public URL for a file in a public bucket (portfolio, avatars). */
export function publicUrl(bucket: "portfolio" | "avatars", path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
