"use server";
import { revalidatePath } from "next/cache";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Shows or hides the designer's latest AI score on their public profile. */
export async function setScorePublic(fd: FormData) {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const value = fd.get("score_public") === "1";
  await supabase.from("designer_profiles").update({ score_public: value }).eq("id", viewer.id);
  revalidatePath(`/designer/analysis/${String(fd.get("review_id") ?? "")}`);
  revalidatePath("/designer/profile");
}
