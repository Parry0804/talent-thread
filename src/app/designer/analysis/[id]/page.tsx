import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Info, Lightbulb, ListChecks, Route, ShieldCheck, Sparkles, ThumbsUp, Wrench,
} from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DIMENSIONS, type CritiquePoint, type ReviewReport } from "@/lib/ai/rubric";
import { expireStaleReviews } from "@/lib/designer-ai/quota";
import { portfolioImage, type ReviewContext } from "@/lib/designer-ai/images";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { Card, CardBody } from "@/components/ui/card";
import { LinkButton, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BandBadge, ScoreBar, ScoreRing } from "@/components/ui/score";
import { CheckDots } from "@/components/designer-ai/check-dots";
import { CopyButton } from "@/components/designer-ai/copy-button";
import { AutoRefresh } from "@/components/designer-ai/auto-refresh";
import { setScorePublic } from "@/app/designer/analysis/[id]/actions";
import type { AiReview } from "@/lib/types";

export const metadata = { title: "Portfolio review" };

const CONFIDENCE: Record<ReviewReport["confidence"], { label: string; tone: "success" | "neutral" | "warning"; hint: string }> = {
  high: { label: "High confidence", tone: "success", hint: "There was enough work and context to judge this well." },
  medium: { label: "Medium confidence", tone: "neutral", hint: "A few things were hard to judge from images alone." },
  low: { label: "Low confidence", tone: "warning", hint: "Treat this score as a rough guide. More images or project context will make it steadier." },
};

function Section({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardBody>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <span className="text-ink-400">{icon}</span>
          {title}
        </h2>
        {children}
      </CardBody>
    </Card>
  );
}

function PointThumb({ point, paths, ctx }: { point: CritiquePoint; paths: string[]; ctx: ReviewContext }) {
  if (!point.image || !paths[point.image - 1]) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-md bg-paper-100 text-center text-[11px] font-medium text-ink-500">
        Whole portfolio
      </div>
    );
  }
  const url = portfolioImage(paths[point.image - 1]);
  const title = ctx.images?.[point.image - 1]?.title;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-paper-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Image ${point.image}`} className="h-full w-full object-cover transition group-hover:scale-105" />
        <span className="absolute left-1.5 top-1.5 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-semibold text-paper-50">Image {point.image}</span>
      </div>
      {title && <div className="mt-1 truncate text-[11px] text-ink-500">{title}</div>}
    </a>
  );
}

export default async function ReviewReportPage({ params }: PageProps<"/designer/analysis/[id]">) {
  const { id } = await params;
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  await expireStaleReviews(viewer.id);
  const [{ data }, { data: dp }] = await Promise.all([
    supabase.from("ai_reviews").select("*").eq("id", id).eq("designer_id", viewer.id).maybeSingle(),
    supabase.from("designer_profiles").select("score_public, latest_score, hourly_rate, slug").eq("id", viewer.id).single(),
  ]);
  if (!data) notFound();
  const review = data as AiReview;
  const back = (
    <Link href="/designer/analysis" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> All reviews</Link>
  );

  if (review.status === "running" || review.status === "queued") {
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <AutoRefresh />
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600"><Sparkles className="animate-pulse" size={26} /></div>
          <h1 className="mt-5 font-display text-2xl font-semibold">Claude is studying your work…</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Your review of {review.image_paths.length} image{review.image_paths.length === 1 ? "" : "s"} started {formatDate(review.created_at)}. It usually takes 1–2 minutes. This page refreshes by itself.
          </p>
        </Card>
      </div>
    );
  }

  if (review.status === "failed" || !review.report || review.overall == null) {
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-600"><AlertCircle size={26} /></div>
          <h1 className="mt-5 font-display text-2xl font-semibold">This review didn&apos;t finish</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{review.error ?? "Something went wrong while reviewing your work."}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">It doesn&apos;t count toward your free reviews.</p>
          <LinkButton href="/designer/analysis/new" className="mt-6"><Sparkles size={16} /> Try again</LinkButton>
        </Card>
      </div>
    );
  }

  const r = review.report;
  const ctx = (review.context ?? {}) as ReviewContext;
  const conf = CONFIDENCE[r.confidence] ?? CONFIDENCE.medium;
  const isPublic = Boolean(dp?.score_public);
  const isLatest = dp?.latest_score === review.overall;
  const hasRoadmap = (r.roadmap?.length ?? 0) > 0;
  const ownRate = dp?.hourly_rate as number | null | undefined;
  const totalPoints = DIMENSIONS.reduce((n, d) => n + (r.dimensions[d.key]?.points.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1040px]">
      {back}

      {/* ── Header ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex justify-center">
            <ScoreRing score={review.overall} size={184} />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">
              <Sparkles size={12} /> AI portfolio review · {formatDate(review.completed_at ?? review.created_at)}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900">
              {r.track} designer
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BandBadge score={review.overall} className="text-sm" />
              <Badge tone={conf.tone}>{conf.label}</Badge>
              {r.samples > 1 && <Badge>Scored {r.samples} times · middle result shown</Badge>}
              <Badge>{review.image_paths.length} image{review.image_paths.length === 1 ? "" : "s"}</Badge>
            </div>
            {r.segments.length > 0 && (
              <p className="mt-4 text-sm text-ink-600">
                <span className="text-ink-500">Your work suits </span>
                {r.segments.map((s, i) => (
                  <span key={s}>
                    <strong className="font-semibold text-ink-900">{s}</strong>
                    {i < r.segments.length - 2 ? ", " : i === r.segments.length - 2 ? " and " : ""}
                  </span>
                ))}
                <span className="text-ink-500"> clients.</span>
              </p>
            )}
            <p className="mt-2 text-xs text-ink-500">{conf.hint}</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-paper-200 bg-paper-50 px-6 py-3 sm:px-8">
          {review.image_paths.map((p, i) => (
            <a key={p} href={portfolioImage(p)} target="_blank" rel="noreferrer" className="relative h-14 w-20 shrink-0 overflow-hidden rounded-sm bg-paper-100" title={ctx.images?.[i]?.title || `Image ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portfolioImage(p)} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
              <span className="absolute bottom-0.5 left-0.5 rounded-full bg-ink-900/80 px-1.5 text-[10px] font-semibold text-paper-50">{i + 1}</span>
            </a>
          ))}
        </div>
      </Card>

      {/* ── Overview + breakdown ──────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card>
          <CardBody className="sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">The short version</p>
            <p className="mt-3 whitespace-pre-line font-display text-xl leading-relaxed text-ink-900">{r.overview}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">Score breakdown</p>
            {DIMENSIONS.map((d) => (
              <a key={d.key} href={`#${d.key}`} className="block rounded-md hover:bg-paper-50">
                <ScoreBar label={d.name} weight={d.weight} score={r.dimensions[d.key]?.score ?? 0} />
              </a>
            ))}
            <p className="text-xs text-ink-500">Percentages show how much each area counts toward your overall score.</p>
          </CardBody>
        </Card>
      </div>

      {/* ── Next steps ─────────────────────────────────────── */}
      {r.next_steps.length > 0 && (
        <Card className="mt-6 border-ink-900 bg-ink-900 text-paper-50">
          <CardBody className="sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><ListChecks size={20} className="text-marigold-500" /> Do these first</h2>
            <p className="mt-1 text-sm text-paper-300">In order of impact. The first one will move your score the most.</p>
            <ol className="mt-5 grid gap-3">
              {r.next_steps.map((s, i) => (
                <li key={i} className="flex gap-4 rounded-md bg-ink-800 p-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-marigold-500 font-display text-sm font-bold text-ink-900">{i + 1}</span>
                  <span className="text-[15px] leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {/* ── Dimensions ─────────────────────────────────────── */}
      <h2 className="mb-1 mt-10 font-display text-2xl font-semibold">Area by area</h2>
      <p className="mb-5 text-sm text-ink-500">
        {totalPoints} specific point{totalPoints === 1 ? "" : "s"}, each tied to an image where possible: what we see, why it matters, and exactly what to change.
      </p>
      <div className="flex flex-col gap-6">
        {DIMENSIONS.map((d) => {
          const dim = r.dimensions[d.key];
          if (!dim) return null;
          return (
            <Card key={d.key} id={d.key} className="scroll-mt-24">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-200 px-6 py-5">
                <div>
                  <h3 className="font-display text-xl font-semibold">{d.name}</h3>
                  <p className="text-sm text-ink-500">Counts for {Math.round(d.weight * 100)}% of your score{dim.confidence === "low" ? " · hard to judge from these images" : ""}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-4xl font-semibold tabular leading-none">{dim.score}</div>
                  <div className="mt-1 text-xs text-ink-500">out of 100</div>
                </div>
              </div>
              <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">Checks</p>
                  <div className="divide-y divide-paper-200">
                    {d.checks.map((c) => (
                      <CheckDots key={c.key} name={c.name} desc={c.desc} value={dim.checks[c.key] ?? 0} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {dim.working && (
                    <div className="rounded-md bg-success-50 p-4">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-success-600"><ThumbsUp size={14} /> What&apos;s working</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-800">{dim.working}</p>
                    </div>
                  )}
                  {dim.points.map((p, i) => (
                    <div key={i} className="grid gap-4 rounded-md border border-paper-200 p-4 sm:grid-cols-[120px_1fr]">
                      <div className="w-full max-w-[160px]"><PointThumb point={p} paths={review.image_paths} ctx={ctx} /></div>
                      <dl className="grid gap-2.5 text-sm leading-relaxed">
                        <div>
                          <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-500"><Eye size={12} /> What we see</dt>
                          <dd className="mt-0.5 text-ink-800">{p.see}</dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-500"><Lightbulb size={12} /> Why it matters</dt>
                          <dd className="mt-0.5 text-ink-700">{p.why}</dd>
                        </div>
                        <div className="rounded-sm border-l-2 border-marigold-500 bg-marigold-50 px-3 py-2">
                          <dt className="flex items-center gap-1.5 text-xs font-semibold text-marigold-800"><Wrench size={12} /> The fix</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{p.fix}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Why this score + rate ──────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Section icon={<Info size={16} />} title="Why this score">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{r.justification}</p>
        </Section>
        <Card className="border-marigold-300 bg-marigold-50">
          <CardBody>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-marigold-800">Rate guide for Indian clients</p>
            <div className="mt-2 font-display text-4xl font-semibold tabular text-ink-900">
              {formatINR(r.rate.min)}–{formatINR(r.rate.max)}
              <span className="ml-1 text-lg font-normal text-ink-500">/hr</span>
            </div>
            <p className="mt-1 text-xs text-ink-600">
              Based on Talent Thread&apos;s rate table for {r.track} work at the {review.band ?? ""} level, not invented by the AI.
            </p>
            {ownRate ? (
              <p className="mt-3 text-sm text-ink-700">
                Your profile rate is <strong className="tabular">{formatINR(ownRate)}/hr</strong>
                {ownRate < r.rate.min ? ": below this range. You could charge more." : ownRate > r.rate.max ? ": above this range. Strong case studies help clients accept it." : ": inside this range."}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-700">You haven&apos;t set an hourly rate yet. <Link href="/designer/profile" className="font-medium underline">Add one to your profile</Link>.</p>
            )}
            {r.rate.note && (
              <p className="mt-3 flex gap-2 rounded-md bg-paper-0 p-3 text-sm text-ink-800"><ArrowRight size={16} className="mt-0.5 shrink-0 text-marigold-600" /> {r.rate.note}</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Roadmap teaser ─────────────────────────────────── */}
      {hasRoadmap && (
        <Card className="mt-6">
          <CardBody className="sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Route size={20} className="text-ink-400" /> Three skills to work on next</h2>
                <p className="mt-1 text-sm text-ink-500">We&apos;ve turned these into a 6-week plan with small weekly tasks.</p>
              </div>
              <LinkButton href="/designer/roadmap">Build my roadmap <ArrowRight size={16} /></LinkButton>
            </div>
            <ol className="mt-5 grid gap-4 md:grid-cols-3">
              {r.roadmap.map((s, i) => (
                <li key={i} className="rounded-md border border-paper-200 p-4">
                  <span className="text-xs font-semibold text-ink-400">Skill {i + 1}</span>
                  <h3 className="mt-0.5 font-semibold text-ink-900">{s.skill}</h3>
                  <p className="mt-1.5 text-sm text-ink-600">{s.why}</p>
                  <p className="mt-3 text-xs text-ink-500"><span className="font-semibold text-ink-700">This week: </span>{s.first_task}</p>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {/* ── Share + visibility ─────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section icon={<Sparkles size={16} />} title="Share your score">
          <blockquote className="rounded-md bg-paper-50 p-4 text-[15px] leading-relaxed text-ink-900">
            &ldquo;{r.share_line || `My portfolio scored ${review.overall}/100 (${review.band}) on Talent Thread's AI review.`}&rdquo;
          </blockquote>
          <div className="mt-3"><CopyButton text={r.share_line || `My portfolio scored ${review.overall}/100 (${review.band}) on Talent Thread's AI review.`} label="Copy text" /></div>
        </Section>
        <Section icon={isPublic ? <Eye size={16} /> : <EyeOff size={16} />} title="Show your score to clients">
          <p className="text-sm text-ink-600">
            {isPublic
              ? "Clients can see your latest score and band on your public profile. The full report always stays private."
              : "Your score is private. Showing it on your profile helps clients trust your work at a glance. The full report always stays private."}
          </p>
          {!isLatest && dp?.latest_score != null && (
            <p className="mt-2 text-xs text-ink-500">Your profile shows your most recent score ({dp.latest_score}), not this older review.</p>
          )}
          <form action={setScorePublic} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="review_id" value={review.id} />
            <input type="hidden" name="score_public" value={isPublic ? "0" : "1"} />
            <Button type="submit" variant={isPublic ? "secondary" : "highlight"}>
              {isPublic ? <><EyeOff size={16} /> Hide score from my profile</> : <><Eye size={16} /> Make score public on my profile</>}
            </Button>
            {dp?.slug && <Link href={`/d/${dp.slug}`} className="text-sm font-medium text-ink-600 underline-offset-2 hover:underline">View my public profile</Link>}
          </form>
        </Section>
      </div>

      {/* ── Limitations & flags ────────────────────────────── */}
      {(r.limitations.length > 0 || r.flags.length > 0) && (
        <Card className="mt-6 bg-paper-50">
          <CardBody className="grid gap-6 md:grid-cols-2">
            {r.limitations.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-ink-900">What we couldn&apos;t judge from these images</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-600">
                  {r.limitations.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            )}
            {r.flags.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900"><ShieldCheck size={14} className="text-ink-400" /> A note on this review</h2>
                <p className="mt-2 text-sm text-ink-600">
                  A reviewer may double-check a few things in this portfolio, which is routine. It doesn&apos;t change your score. If you worked in a team or some pieces are concept work, saying so in the project brief next time helps.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-paper-200 pt-6">
        <p className="text-xs text-ink-500">Reviewed by {review.model ?? "Claude"} · rubric {review.rubric_version}. AI feedback can be wrong; trust your judgement too.</p>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/designer/analysis/new" variant="secondary"><Sparkles size={16} /> Run a new review</LinkButton>
          {hasRoadmap && <LinkButton href="/designer/roadmap"><Route size={16} /> Build my roadmap</LinkButton>}
        </div>
      </div>
    </div>
  );
}
