import Link from "next/link";
import { ArrowRight, Check, Link2, Route, Sparkles, TrendingUp } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BANDS, bandFor, rateGuide, TRACKS, type Band, type ReviewReport, type Track } from "@/lib/ai/rubric";
import { ROADMAP_WEEKS, WEEK_THEMES } from "@/lib/designer-ai/roadmap";
import { formatDate } from "@/lib/format";
import { weekSince } from "@/lib/designer-ai/time";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/cn";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/form";
import { buildFromLatestReview, saveProof, toggleTask } from "@/app/designer/roadmap/actions";

export const metadata = { title: "Skill roadmap" };

type Task = { id: string; week: number; skill: string; title: string; detail: string; resource_url: string | null; done: boolean; proof_url: string | null; sort: number };
type SkillInfo = { skill: string; why: string; first_task: string };

export default async function RoadmapPage({ searchParams }: PageProps<"/designer/roadmap">) {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const sp = await searchParams;

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, review_id, skills, weeks, created_at")
    .eq("designer_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!roadmap) {
    const { count: doneReviews } = await supabase.from("ai_reviews").select("id", { count: "exact", head: true }).eq("designer_id", viewer.id).eq("status", "done");
    return (
      <div>
        <PageHeader eyebrow="Skill roadmap" title="Your 6-week skill roadmap" sub="A short, practical plan to grow the three skills that will lift your portfolio and your rate the most." />
        {doneReviews ? (
          <EmptyState
            icon={<Route size={28} />}
            title="Your roadmap isn't built yet"
            body="We'll turn the three skills from your latest AI review into six weeks of small tasks you can tick off."
            action={<form action={buildFromLatestReview}><SubmitButton pending="Building…">Build my roadmap</SubmitButton></form>}
          />
        ) : (
          <EmptyState
            icon={<Route size={28} />}
            title="No roadmap yet"
            body="Your roadmap comes from your AI portfolio review. Once your first review is done, you'll see three skills to work on and a week-by-week task list here."
            action={<LinkButton href="/designer/analysis/new"><Sparkles size={16} /> Start my first review</LinkButton>}
          />
        )}
      </div>
    );
  }

  const [{ data: taskRows }, { data: review }] = await Promise.all([
    supabase.from("roadmap_tasks").select("*").eq("roadmap_id", roadmap.id).order("week").order("sort"),
    roadmap.review_id
      ? supabase.from("ai_reviews").select("id, overall, band, report, completed_at").eq("id", roadmap.review_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const tasks = (taskRows ?? []) as Task[];
  const skills = (roadmap.skills ?? []) as SkillInfo[];
  const weeks = roadmap.weeks || ROADMAP_WEEKS;
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  // Which week to show: ?week=n, else the first week with unfinished tasks.
  const calendarWeek = Math.min(weeks, weekSince(roadmap.created_at));
  const firstOpen = Array.from({ length: weeks }, (_, i) => i + 1).find((w) => tasks.some((t) => t.week === w && !t.done)) ?? weeks;
  const requested = Number(sp.week);
  const week = Number.isInteger(requested) && requested >= 1 && requested <= weeks ? requested : firstOpen;
  const weekTasks = tasks.filter((t) => t.week === week);

  // Earnings impact: this band's rate range vs the next band's.
  const report = review?.report as ReviewReport | null | undefined;
  const track: Track | null = report?.track && (TRACKS as readonly string[]).includes(report.track) ? report.track : null;
  const band: Band | null = review?.overall != null ? bandFor(review.overall) : null;
  const bandIdx = band ? BANDS.findIndex((b) => b.name === band) : -1;
  const next = bandIdx > 0 ? BANDS[bandIdx - 1] : null;
  const now = track && band ? rateGuide(track, band) : null;
  const then = track && next ? rateGuide(track, next.name) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Skill roadmap"
        title="Your 6-week skill roadmap"
        sub={
          review
            ? <>Built from your AI review on {formatDate(review.completed_at ?? roadmap.created_at)}{review.overall != null ? ` (score ${review.overall})` : ""}. <Link href={`/designer/analysis/${review.id}`} className="text-ink-900 underline-offset-2 hover:underline">Read the report</Link></>
            : `Started ${formatDate(roadmap.created_at)}.`
        }
        action={
          <div className="w-56">
            <div className="flex justify-between text-sm"><span className="text-ink-500">Progress</span><span className="font-medium tabular">{doneCount} of {tasks.length} tasks</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-100"><div className="h-full rounded-full bg-marigold-500" style={{ width: `${pct}%` }} /></div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="grid gap-4 sm:grid-cols-3">
          {skills.map((s, i) => {
            const st = tasks.filter((t) => t.skill === s.skill);
            const d = st.filter((t) => t.done).length;
            const p = st.length ? Math.round((d / st.length) * 100) : 0;
            return (
              <Card key={s.skill} className="flex flex-col p-5">
                <span className="text-xs font-semibold text-ink-400">Skill {i + 1}</span>
                <h2 className="mt-0.5 font-semibold text-ink-900">{s.skill}</h2>
                <p className="mt-1.5 flex-1 text-sm text-ink-600">{s.why}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-ink-500"><span>{d} of {st.length} done</span><span className="tabular">{p}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-100"><div className="h-full rounded-full bg-ink-900" style={{ width: `${p}%` }} /></div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="border-marigold-300 bg-marigold-50 p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-marigold-800"><TrendingUp size={12} /> Earnings impact</p>
          {now && band && track ? (
            next && then ? (
              <>
                <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div>
                    <div className="text-xs text-ink-500">Now · {band}</div>
                    <div className="font-display text-lg font-semibold tabular">{formatINR(now.min)}–{formatINR(now.max)}</div>
                  </div>
                  <ArrowRight size={16} className="text-marigold-600" />
                  <div>
                    <div className="text-xs text-ink-500">At {next.name} ({next.min}+)</div>
                    <div className="font-display text-lg font-semibold tabular text-ink-900">{formatINR(then.min)}–{formatINR(then.max)}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink-700">
                  Per hour, for {track} work. Moving up a band could add about <strong className="tabular">{formatINR(Math.max(0, then.min - now.min))}–{formatINR(Math.max(0, then.max - now.max))}/hr</strong> to what Indian clients expect to pay you.
                </p>
              </>
            ) : (
              <>
                <div className="mt-3 font-display text-2xl font-semibold tabular">{formatINR(now.min)}–{formatINR(now.max)}<span className="text-base font-normal text-ink-500">/hr</span></div>
                <p className="mt-2 text-sm text-ink-700">You&apos;re in the top band for {track} work. Keep your case studies fresh to stay at the top of this range.</p>
              </>
            )
          ) : (
            <p className="mt-3 text-sm text-ink-700">Run an AI review to see how your rate could grow as your score improves.</p>
          )}
        </Card>
      </div>

      {/* Week tabs */}
      <nav className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-label="Weeks">
        {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => {
          const wt = tasks.filter((t) => t.week === w);
          const all = wt.length > 0 && wt.every((t) => t.done);
          return (
            <Link
              key={w}
              href={`/designer/roadmap?week=${w}`}
              aria-current={w === week ? "page" : undefined}
              className={cn(
                "flex min-w-[120px] shrink-0 flex-col rounded-md border px-4 py-2.5 text-left transition-colors",
                w === week ? "border-ink-900 bg-ink-900 text-paper-50" : "border-paper-200 bg-paper-0 text-ink-900 hover:border-ink-300",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                Week {w} {all && <Check size={14} className={w === week ? "text-marigold-500" : "text-success-600"} />}
              </span>
              <span className={cn("text-xs", w === week ? "text-paper-300" : "text-ink-500")}>
                {WEEK_THEMES[w]?.title ?? ""}{w === calendarWeek ? " · this week" : ""}
              </span>
            </Link>
          );
        })}
      </nav>

      <Card className="mt-4">
        <CardBody>
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">Week {week}: {WEEK_THEMES[week]?.title}</h2>
            <p className="text-sm text-ink-500">{WEEK_THEMES[week]?.sub}</p>
          </div>
          {weekTasks.length === 0 ? (
            <p className="text-sm text-ink-500">No tasks this week. Use it to catch up on anything left over.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {skills.map((s) => {
                const list = weekTasks.filter((t) => t.skill === s.skill);
                if (!list.length) return null;
                return (
                  <div key={s.skill}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-ink-500">{s.skill}</h3>
                    <ul className="flex flex-col gap-2">
                      {list.map((t) => (
                        <li key={t.id} className={cn("flex gap-3 rounded-md border p-4", t.done ? "border-paper-200 bg-paper-50" : "border-paper-200 bg-paper-0")}>
                          <form action={toggleTask}>
                            <input type="hidden" name="task_id" value={t.id} />
                            <input type="hidden" name="done" value={t.done ? "0" : "1"} />
                            <button
                              type="submit"
                              aria-label={t.done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
                              className={cn(
                                "mt-0.5 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors",
                                t.done ? "border-success-600 bg-success-600 text-white" : "border-paper-300 hover:border-ink-900",
                              )}
                            >
                              {t.done && <Check size={14} />}
                            </button>
                          </form>
                          <div className="min-w-0 flex-1">
                            <div className={cn("font-medium", t.done ? "text-ink-500 line-through decoration-ink-300" : "text-ink-900")}>{t.title}</div>
                            <p className="mt-0.5 text-sm text-ink-600">{t.detail}</p>
                            {t.resource_url && <a href={t.resource_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-violet-600 hover:underline">Helpful resource</a>}
                            {t.proof_url ? (
                              <a href={t.proof_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-ink-700 hover:underline">
                                <Link2 size={14} /> Your proof
                              </a>
                            ) : null}
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-medium text-ink-500 hover:text-ink-900">{t.proof_url ? "Change proof link" : "Add a proof link (optional)"}</summary>
                              <form action={saveProof} className="mt-2 flex flex-wrap gap-2">
                                <input type="hidden" name="task_id" value={t.id} />
                                <Input name="proof_url" defaultValue={t.proof_url ?? ""} placeholder="behance.net/gallery/… or a Figma link" className="max-w-sm flex-1" />
                                <SubmitButton size="sm" variant="secondary" pending="Saving…">Save link</SubmitButton>
                              </form>
                            </details>
                          </div>
                          {t.done && <Badge tone="success" className="self-start">Done</Badge>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-paper-200 pt-4">
            {week > 1 ? <LinkButton href={`/designer/roadmap?week=${week - 1}`} variant="ghost" size="sm">← Week {week - 1}</LinkButton> : <span />}
            {week < weeks ? <LinkButton href={`/designer/roadmap?week=${week + 1}`} variant="secondary" size="sm">Week {week + 1} →</LinkButton> : <LinkButton href="/designer/analysis/new" size="sm"><Sparkles size={14} /> Run a fresh review</LinkButton>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
