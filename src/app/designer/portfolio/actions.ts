"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JOB_CATEGORIES } from "@/lib/options";
import type { ActionState } from "@/components/ui/action-form";

const MAX_IMAGES = 8;

function readPiece(fd: FormData, userId: string) {
  const title = String(fd.get("title") ?? "").trim().slice(0, 120);
  const category = String(fd.get("category") ?? "");
  const description = String(fd.get("description") ?? "").trim().slice(0, 4000);
  let link = String(fd.get("link") ?? "").trim().slice(0, 500);
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  const image_paths = [...new Set(fd.getAll("image_paths").map(String).filter(Boolean))];
  if (!title) return { error: "Give this piece a title, like “Masala Co. brand identity”." };
  if (!JOB_CATEGORIES.includes(category)) return { error: "Pick a category." };
  if (!image_paths.length) return { error: "Add at least one image. The first one becomes the cover." };
  if (image_paths.length > MAX_IMAGES) return { error: `A piece can have up to ${MAX_IMAGES} images.` };
  if (image_paths.some((p) => !p.startsWith(`${userId}/`))) return { error: "Some images couldn't be added. Please upload them again." };
  if (link) {
    try {
      new URL(link);
    } catch {
      return { error: "That link doesn't look right. Paste the full address, like behance.net/gallery/…" };
    }
  }
  return { data: { title, category, description, link: link || null, image_paths } };
}

export async function createPiece(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const parsed = readPiece(fd, viewer.id);
  if ("error" in parsed) return { error: parsed.error };
  const { data: last } = await supabase.from("portfolio_items").select("sort").eq("designer_id", viewer.id).order("sort", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("portfolio_items").insert({ ...parsed.data, designer_id: viewer.id, sort: (last?.sort ?? -1) + 1 });
  if (error) return { error: "We couldn't save this piece. Please try again." };
  revalidatePath("/designer/portfolio");
  redirect("/designer/portfolio?saved=1");
}

export async function updatePiece(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  const parsed = readPiece(fd, viewer.id);
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.from("portfolio_items").update(parsed.data).eq("id", id).eq("designer_id", viewer.id);
  if (error) return { error: "We couldn't save your changes. Please try again." };
  revalidatePath("/designer/portfolio");
  redirect("/designer/portfolio?saved=1");
}

/** Deletes the piece. Its image files stay in storage because past AI reviews still show them. */
export async function deletePiece(fd: FormData) {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  await supabase.from("portfolio_items").delete().eq("id", String(fd.get("id") ?? "")).eq("designer_id", viewer.id);
  revalidatePath("/designer/portfolio");
  redirect("/designer/portfolio");
}

/** Swaps a piece with its neighbour. Re-numbers everything so sort values stay unique. */
export async function movePiece(fd: FormData) {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const id = String(fd.get("id") ?? "");
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const { data } = await supabase.from("portfolio_items").select("id").eq("designer_id", viewer.id).order("sort").order("created_at");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((pid, sort) => supabase.from("portfolio_items").update({ sort }).eq("id", pid).eq("designer_id", viewer.id)));
  revalidatePath("/designer/portfolio");
}
