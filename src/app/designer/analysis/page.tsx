import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DIMENSIONS, bandFor } from "@/lib/ai/rubric";
import { expireStaleReviews, getQuota } from "@/lib/designer-ai/quota";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BandBadge, ScoreBar, ScoreRing } from "@/components/ui/score";
import { ScoreTrend } from "@/components/designer-ai/score-trend";
import type { AiReview } from "@/lib/types";

export const metadata = { title: "AI analysis" };

export default async function AnalysisHubPage() {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  await expireStaleReviews(viewer.id);
  const [quota, { data }] = await Promise.all([
    getQuota(supabase, viewer.id),
    supabase
      .from("ai_reviews")
      .select("id, status, overall, band, dims, report, error, created_at, completed_at, image_paths")
      .eq("designer_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const reviews = (data ?? []) as AiReview[];
  const done = reviews.filter((r) => r.status === "done" && r.overall != null);
  const latest = done[0];
  const previous = done[1];
  const delta = latest && previous ? latest.overall! - previous.overall! : null;
  const trend = [...done].reverse().map((r) => ({ score: r.overall!, date: r.completed_at ?? r.created_at }));

  const quotaLine =
    quota.limit === null
      ? "Pro plan · unlimited reviews"
      : `${Math.min(quota.used, quota.limit)} of ${quota.limit} free reviews used this month`;

  const cta = (
    <LinkButton href={quota.blocked ? "/designer/upgrade" : "/designer/analysis/new"} size="lg">
      <Sparkles size={16} /> {quota.blocked ? "Get unlimited reviews" : "Start a new review"}
    </LinkButton>
  );

  return (
    <div>
      <PageHeader
        eyebrow="AI analysis"
        title="Your portfolio, reviewed"
        sub="A creative director's read on your work: what clients will notice, what to fix first, and what you can charge."
        action={cta}
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-50 text-violet-600"><Sparkles size={16} /></span>
          <div>
            <div className="text-sm font-medium text-ink-900">{quotaLine}</div>
            <div className="text-xs text-ink-500">
              {quota.limit === null
                ? "Re-check your work as often as you like."
                : quota.blocked
                  ? "Your free reviews reset on the 1st. Failed reviews never count."
                  : `${quota.remaining} left. Resets on the 1st; failed reviews never count.`}
            </div>
          </div>
        </div>
        {quota.limit !== null && (
          <div className="flex items-center gap-4">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-paper-100">
              <div className="h-full bg-marigold-500" style={{ width: `${(Math.min(quota.used, quota.limit) / quota.limit) * 100}%` }} />
            </div>
            <Link href="/designer/upgrade" className="text-sm font-medium text-violet-600 hover:underline">Pro · ₹499/month</Link>
          </div>
        )}
      </Card>

      {!latest ? (
        <EmptyState
          icon={<Sparkles size={28} />}
          title="No reviews yet"
          body="Your score, a breakdown across four areas clients care about, and image-by-image fixes will appear here. Upload 5 to 8 of your best pieces with a line or two about each to get your first review."
          action={quota.blocked ? undefined : <LinkButton href="/designer/analysis/new"><Sparkles size={16} /> Start my first review</LinkButton>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Card>
            <CardBody className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-ink-500">Latest score · {formatDate(latest.completed_at ?? latest.created_at)}</p>
              <ScoreRing score={latest.overall!} size={168} />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <BandBadge score={latest.overall!} />
                {latest.report?.track && <Badge>{latest.report.track}</Badge>}
                {delta !== null && delta !== 0 && (
                  <Badge tone={delta > 0 ? "success" : "neutral"}>{delta > 0 ? `+${delta}` : delta} since last review</Badge>
                )}
              </div>
              {latest.report?.rate && (
                <p className="text-sm text-ink-600">
                  Suggested rate: <strong className="font-semibold text-ink-900 tabular">{formatINR(latest.report.rate.min)}–{formatINR(latest.report.rate.max)}/hr</strong>
                </p>
              )}
              <LinkButton href={`/designer/analysis/${latest.id}`} variant="secondary">Read the full report</LinkButton>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Where your score comes from" sub="Each area is weighted by how much it matters to clients." />
            <CardBody className="flex flex-col gap-5">
              {DIMENSIONS.map((d) => (
                <ScoreBar key={d.key} label={d.name} weight={d.weight} score={latest.dims?.[d.key] ?? latest.report?.dimensions[d.key]?.score ?? 0} />
              ))}
            </CardBody>
          </Card>

          {trend.length > 1 && (
            <Card className="lg:col-span-2">
              <CardHeader title="Score over time" sub="Dashed lines mark the bands: 50 Developing, 70 Strong, 85 Exceptional." />
              <CardBody><ScoreTrend points={trend} /></CardBody>
            </Card>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="All reviews" sub={`${reviews.length} review${reviews.length === 1 ? "" : "s"}`} />
          <CardBody className="px-0 pb-2 pt-3">
            <ul className="divide-y divide-paper-200">
              {reviews.map((r) => (
                <li key={r.id}>
                  <Link href={`/designer/analysis/${r.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-paper-50">
                    <div className="w-12 shrink-0 text-center font-display text-2xl font-semibold tabular">
                      {r.status === "done" && r.overall != null ? r.overall : "–"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
                        {formatDate(r.created_at)}
                        {r.status === "done" && r.overall != null && <BandBadge score={r.overall} />}
                        {r.status === "failed" && <Badge tone="danger">Didn&apos;t finish</Badge>}
                        {(r.status === "running" || r.status === "queued") && <Badge tone="brand">In progress</Badge>}
                      </div>
                      <div className="truncate text-xs text-ink-500">
                        {r.status === "failed"
                          ? (r.error ?? "This review didn't finish. It doesn't count toward your free reviews.")
                          : `${r.image_paths.length} image${r.image_paths.length === 1 ? "" : "s"}${r.report?.track ? ` · ${r.report.track}` : ""}${r.overall != null ? ` · ${bandFor(r.overall)}` : ""}`}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-ink-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
