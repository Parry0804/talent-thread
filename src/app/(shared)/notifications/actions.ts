"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead() {
  const viewer = await requireOnboarded();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("user_id", viewer.id).eq("read", false);
  revalidatePath("/notifications");
}

/** Marks one notification read, then follows its link. */
export async function openNotification(fd: FormData) {
  const viewer = await requireOnboarded();
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", viewer.id).select("link").maybeSingle();
  const link = data?.link as string | null | undefined;
  redirect(link && link.startsWith("/") ? link : "/notifications");
}
