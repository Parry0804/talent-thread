import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_REVIEW_IMAGES } from "@/lib/ai/rubric";
import { expireStaleReviews, getQuota } from "@/lib/designer-ai/quota";
import { PageHeader, Card, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ReviewComposer, type PickableItem } from "@/components/designer-ai/review-composer";
import { startReview } from "@/app/designer/analysis/new/actions";

export const metadata = { title: "New AI review" };
// The review call takes 30–120 seconds; this also sets the server action's limit.
export const maxDuration = 300;

export default async function NewReviewPage() {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  await expireStaleReviews(viewer.id);
  const [quota, { data: items }] = await Promise.all([
    getQuota(supabase, viewer.id),
    supabase.from("portfolio_items").select("id, title, description, image_paths").eq("designer_id", viewer.id).order("sort"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/designer/analysis" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> AI analysis</Link>
      <PageHeader
        eyebrow="AI portfolio review"
        title="Get your work reviewed"
        sub="Claude reviews your portfolio like a senior creative director: a score out of 100, specific fixes tied to each image, a fair rate range for Indian clients, and a 6-week plan to grow."
      />
      {quota.blocked ? (
        <EmptyState
          icon={<Sparkles size={28} />}
          title={`You've used your ${quota.limit} free reviews this month`}
          body="Your free reviews reset on the 1st of next month. Pro gives you unlimited reviews, so you can re-check your portfolio every time you improve it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton href="/designer/upgrade">See the Pro plan</LinkButton>
              <LinkButton href="/designer/roadmap" variant="secondary">Work on my roadmap</LinkButton>
            </div>
          }
        />
      ) : (
        <>
          {quota.limit !== null && (
            <Card className="mb-6 flex items-center justify-between gap-4 bg-marigold-50 px-5 py-3 text-sm">
              <span className="text-ink-700">
                <strong className="font-semibold text-ink-900">{quota.remaining} of {quota.limit}</strong> free reviews left this month. Failed reviews don&apos;t count.
              </span>
              <Link href="/designer/upgrade" className="font-medium text-violet-600 hover:underline">Go unlimited</Link>
            </Card>
          )}
          <ReviewComposer action={startReview} userId={viewer.id} items={(items ?? []) as PickableItem[]} max={MAX_REVIEW_IMAGES} />
        </>
      )}
    </div>
  );
}
