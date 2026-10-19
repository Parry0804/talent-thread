"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOnboarded } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runPortfolioReview, ReviewError, type ReviewImage } from "@/lib/ai/review";
import { MAX_REVIEW_IMAGES, RUBRIC_VERSION } from "@/lib/ai/rubric";
import { experienceLabel } from "@/lib/options";
import { notify } from "@/lib/notify";
import { expireStaleReviews, getQuota } from "@/lib/designer-ai/quota";
import { createRoadmapFromReview } from "@/lib/designer-ai/roadmap";
import type { ActionState } from "@/components/ui/action-form";

const ImageInput = z.object({
  path: z.string().min(1).max(300),
  title: z.string().max(100).default(""),
  brief: z.string().max(400).default(""),
  role: z.string().max(200).default(""),
  outcome: z.string().max(200).default(""),
});

const MEDIA: Record<string, ReviewImage["mediaType"]> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Base64 adds a third; the API caps a request at 32 MB.
const MAX_TOTAL_BYTES = 22 * 1024 * 1024;

export async function startReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const db = createServiceClient();

  // 1. Validate input.
  let images: z.infer<typeof ImageInput>[];
  try {
    images = z.array(ImageInput).parse(JSON.parse(String(fd.get("images") ?? "[]")));
  } catch {
    return { error: "We couldn't read your image list. Please refresh the page and pick your images again." };
  }
  images = images.filter((im, i, all) => all.findIndex((x) => x.path === im.path) === i);
  if (!images.length) return { error: "Add at least one image to review." };
  if (images.length > MAX_REVIEW_IMAGES) return { error: `A review can include up to ${MAX_REVIEW_IMAGES} images. Remove a few and try again.` };
  if (images.some((im) => !im.path.startsWith(`${viewer.id}/`))) return { error: "You can only review images you uploaded yourself." };
  if (fd.get("own_work") !== "on") return { error: "Please confirm this is your own work." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 600);

  // 2. Quota and double-submit guard.
  await expireStaleReviews(viewer.id);
  const quota = await getQuota(supabase, viewer.id);
  if (quota.blocked) {
    return { error: `You've used all ${quota.limit} free reviews this month. Your free reviews reset on the 1st, or go Pro for unlimited reviews (see Upgrade in the sidebar).` };
  }
  const { count: running } = await supabase.from("ai_reviews").select("id", { count: "exact", head: true }).eq("designer_id", viewer.id).in("status", ["queued", "running"]);
  if (running) return { error: "You already have a review in progress. Wait for it to finish, then start another." };

  // 3. Insert the running review.
  const { data: row, error: insErr } = await db
    .from("ai_reviews")
    .insert({
      designer_id: viewer.id,
      status: "running",
      image_paths: images.map((i) => i.path),
      context: { images: images.map(({ title, brief, role, outcome }) => ({ title, brief, role, outcome })), note, own_work: true },
      rubric_version: RUBRIC_VERSION,
    })
    .select("id")
    .single();
  if (insErr || !row) return { error: "We couldn't start your review. Please try again in a minute." };
  const reviewId = row.id as string;

  try {
    // 4. Download the images with the service client.
    const reviewImages: ReviewImage[] = [];
    let totalBytes = 0;
    for (const [i, im] of images.entries()) {
      const { data: blob, error } = await db.storage.from("portfolio").download(im.path);
      if (error || !blob) throw new ReviewError(`We couldn't open image ${i + 1}. Remove it or upload it again.`);
      if (blob.size > MAX_IMAGE_BYTES) throw new ReviewError(`Image ${i + 1} is larger than 5 MB. Upload a smaller version (it's resized automatically when you upload here).`);
      totalBytes += blob.size;
      if (totalBytes > MAX_TOTAL_BYTES) throw new ReviewError("Your images are too large to review together. Remove a few, or upload smaller versions, and try again.");
      const ext = im.path.split(".").pop()?.toLowerCase() ?? "";
      const mediaType = (MEDIA[ext] ?? (Object.values(MEDIA).includes(blob.type as ReviewImage["mediaType"]) ? blob.type : null)) as ReviewImage["mediaType"] | null;
      if (!mediaType) throw new ReviewError(`Image ${i + 1} isn't a JPG, PNG, WebP or GIF.`);
      reviewImages.push({
        data: Buffer.from(await blob.arrayBuffer()),
        mediaType,
        title: im.title.trim() || undefined,
        brief: im.brief.trim() || undefined,
        role: im.role.trim() || undefined,
        outcome: im.outcome.trim() || undefined,
      });
    }

    // 5. Run the review.
    const { data: dp } = await supabase.from("designer_profiles").select("disciplines, years_experience").eq("id", viewer.id).single();
    const disciplines = (dp?.disciplines as string[] | undefined) ?? [];
    const result = await runPortfolioReview({
      images: reviewImages,
      designerName: viewer.full_name || "the designer",
      discipline: disciplines.join(", ") || "not stated",
      experience: experienceLabel(Number(dp?.years_experience ?? 0)),
      note,
    });

    // 6. Save it.
    const { error: upErr } = await db
      .from("ai_reviews")
      .update({
        status: "done",
        overall: result.overall,
        band: result.band,
        dims: result.dims,
        report: result.report,
        model: result.model,
        rubric_version: result.rubricVersion,
        completed_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", reviewId);
    if (upErr) throw new Error(`save failed: ${upErr.message}`);
    await db.from("designer_profiles").update({ latest_score: result.overall, latest_band: result.band }).eq("id", viewer.id);

    // 7. Roadmap and notification. A roadmap failure shouldn't lose the review.
    try {
      await createRoadmapFromReview(db, viewer.id, reviewId, result.report);
    } catch (e) {
      console.error("[analysis] roadmap", e);
    }
    await notify(viewer.id, "ai_review_done", `Your portfolio scored ${result.overall} (${result.band})`, "Your full report and a 6-week skill roadmap are ready.", `/designer/analysis/${reviewId}`);
  } catch (e) {
    console.error("[analysis] review failed", e);
    const message =
      e instanceof ReviewError
        ? e.message
        : String((e as Error)?.message ?? "").includes("ANTHROPIC_API_KEY")
          ? "AI reviews aren't switched on yet on this site. Please try again later."
          : "Something went wrong while reviewing your work. Please try again.";
    await db.from("ai_reviews").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", reviewId);
    return { error: `${message} This attempt doesn't count toward your free reviews.` };
  }

  redirect(`/designer/analysis/${reviewId}`);
}
