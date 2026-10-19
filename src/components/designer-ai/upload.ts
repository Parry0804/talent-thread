"use client";
import { createClient } from "@/lib/supabase/client";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_EDGE = 2400;
const MAX_BYTES = 2 * 1024 * 1024;

/** Re-encodes large photos so they upload fast and stay under the AI's image size limit. */
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return blob && blob.size < file.size ? blob : file;
}

const safeName = (n: string) => n.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "image";

/** Uploads one image to "<user id>/<uuid>-<filename>" and returns the storage path. */
export async function uploadImage(file: File, userId: string, bucket: "portfolio" | "avatars"): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name} isn't a JPG, PNG, WebP or GIF.`);
  const blob = await shrink(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : (blob.type.split("/")[1] ?? "jpg");
  const path = `${userId}/${crypto.randomUUID()}-${safeName(file.name)}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || file.type, upsert: false });
  if (error) throw new Error(`We couldn't upload ${file.name}. Check your connection and try again.`);
  return path;
}
