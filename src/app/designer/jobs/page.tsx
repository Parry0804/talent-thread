import Link from "next/link";
import { Mail, Search, SearchX } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFitContext } from "@/lib/matching/context";
import { jobExtras } from "@/components/designer-work/data";
import { JobCard } from "@/components/designer-work/job-card";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Button, LinkButton } from "@/components/ui/button";
import { JOB_CATEGORIES, SKILLS } from "@/lib/options";
import { formatBudget } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Job } from "@/lib/types";

export const metadata = { title: "Find work" };

const SORTS = { match: "Best match", newest: "Newest", budget: "Highest budget" } as const;
type Sort = keyof typeof SORTS;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const clean = (s: string) => s.replace(/[%,(){}"*\\]/g, " ").trim().slice(0, 80);

export default async function JobsPage({ searchParams }: PageProps<"/designer/jobs">) {
  const viewer = await requireOnboarded("designer");
  const sp = await searchParams;
  const tab = one(sp.tab) === "saved" ? "saved" : "all";
  const q = clean(one(sp.q));
  const category = JOB_CATEGORIES.includes(one(sp.category)) ? one(sp.category) : "";
  const type = ["fixed", "hourly"].includes(one(sp.type)) ? one(sp.type) : "";
  const experience = clean(one(sp.experience));
  const min = Math.max(0, Number(one(sp.min)) || 0);
  const max = Math.max(0, Number(one(sp.max)) || 0);
  const sort: Sort = (one(sp.sort) in SORTS ? one(sp.sort) : "match") as Sort;

  const supabase = await createClient();
  const [ctx, { data: savedRows }, { data: myApps }, { data: inviteRows }, { data: expRows }] = await Promise.all([
    loadFitContext(viewer.id),
    supabase.from("saved_jobs").select("job_id").eq("designer_id", viewer.id),
    supabase.from("applications").select("job_id").eq("designer_id", viewer.id),
    supabase.from("invites").select("id, job_id, message, created_at").eq("designer_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("jobs").select("experience_level").eq("status", "open").not("experience_level", "is", null).limit(500),
  ]);
  const savedIds = new Set((savedRows ?? []).map((r) => r.job_id as string));
  const appliedIds = new Set((myApps ?? []).map((r) => r.job_id as string));
  const experienceOptions = [...new Set((expRows ?? []).map((r) => String(r.experience_level)).filter(Boolean))].sort();

  // Text search: title/description via ilike, skills via array overlap with matching pick-list skills.
  const skillHits = q ? [q, ...SKILLS.filter((s) => s.toLowerCase().includes(q.toLowerCase()))] : [];
  const build = (mode: "text" | "skills" | "none") => {
    let query = supabase.from("jobs").select("*").eq("status", "open");
    if (tab === "saved") query = query.in("id", savedIds.size ? [...savedIds] : ["00000000-0000-0000-0000-000000000000"]);
    if (mode === "text") query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (mode === "skills") query = query.overlaps("skills", skillHits);
    if (category) query = query.eq("category", category);
    if (type) query = query.eq("budget_type", type);
    if (experience) query = query.eq("experience_level", experience);
    if (min) query = query.gte("budget_max", min);
    if (max) query = query.lte("budget_min", max);
    if (sort === "budget") query = query.order("budget_max", { ascending: false });
    return query.order("published_at", { ascending: false, nullsFirst: false }).limit(sort === "match" ? 200 : 60);
  };
  const results = q ? await Promise.all([build("text"), build("skills")]) : [await build("none")];
  const byId = new Map<string, Job>();
  for (const r of results) for (const j of (r.data ?? []) as Job[]) byId.set(j.id, j);
  const rows = [...byId.values()];
  if (sort === "budget") rows.sort((a, b) => b.budget_max - a.budget_max);
  else rows.sort((a, b) => (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at));
  const jobs = rows;
  const scored = jobs.map((job) => ({ job, fit: ctx.score(job) }));
  if (sort === "match") scored.sort((a, b) => b.fit.score - a.fit.score);
  const list = scored.slice(0, 60);

  // Invites at the top, for open jobs you haven't applied to yet.
  const inviteJobIds = (inviteRows ?? []).map((i) => i.job_id as string).filter((id) => !appliedIds.has(id));
  const { data: inviteJobsRaw } = inviteJobIds.length
    ? await supabase.from("jobs").select("*").in("id", inviteJobIds).eq("status", "open")
    : { data: [] as Job[] };
  const inviteJobs = (inviteJobsRaw ?? []) as Job[];
  const extras = await jobExtras([...list.map((s) => s.job), ...inviteJobs]);
  const invites = (inviteRows ?? [])
    .map((i) => ({ ...i, job: inviteJobs.find((j) => j.id === i.job_id) }))
    .filter((i): i is typeof i & { job: Job } => !!i.job);

  const filtersOn = !!(q || category || type || experience || min || max);
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { tab, q, category, type, experience, min: min ? String(min) : "", max: max ? String(max) : "", sort };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v && !(k === "tab" && v === "all") && !(k === "sort" && v === "match")) p.set(k, v);
    const s = p.toString();
    return `/designer/jobs${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Find work" sub="Open briefs from Indian brands and startups, ranked by how well they fit your skills, rate and availability." />

      {invites.length > 0 && tab === "all" && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink-900"><Mail size={16} aria-hidden />You&apos;ve been invited</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {invites.map((i) => (
              <Card key={i.id} className="flex flex-col gap-2 border-marigold-300 bg-marigold-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/designer/jobs/${i.job.id}`} className="font-semibold text-ink-900 hover:underline">{i.job.title}</Link>
                    <p className="text-sm text-ink-600">{extras.company[i.job.client_id]} invited you {timeAgo(i.created_at)}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular">{formatBudget(i.job.budget_min, i.job.budget_max, i.job.budget_type)}</span>
                </div>
                {i.message && <p className="line-clamp-2 text-sm text-ink-700">&ldquo;{i.message}&rdquo;</p>}
                <LinkButton href={`/designer/jobs/${i.job.id}#apply`} size="sm" className="self-start">View brief and apply</LinkButton>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="mb-5 flex items-center gap-1 border-b border-paper-200">
        {(["all", "saved"] as const).map((t) => (
          <Link
            key={t}
            href={href({ tab: t })}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", tab === t ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800")}
          >
            {t === "all" ? "All open jobs" : `Saved (${savedIds.size})`}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-5">
          <form className="flex flex-col gap-4" action="/designer/jobs">
            {tab === "saved" && <input type="hidden" name="tab" value="saved" />}
            <Field label="Search">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                <Input name="q" defaultValue={q} placeholder="Logo, packaging, Figma…" className="pl-9" />
              </div>
            </Field>
            <Field label="Category">
              <Select name="category" defaultValue={category}>
                <option value="">All categories</option>
                {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Budget type">
              <Select name="type" defaultValue={type}>
                <option value="">Fixed or hourly</option>
                <option value="fixed">Fixed price</option>
                <option value="hourly">Hourly</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min ₹"><Input name="min" type="number" min={0} step={500} defaultValue={min || ""} placeholder="0" /></Field>
              <Field label="Max ₹"><Input name="max" type="number" min={0} step={500} defaultValue={max || ""} placeholder="Any" /></Field>
            </div>
            {experienceOptions.length > 0 && (
              <Field label="Experience">
                <Select name="experience" defaultValue={experience}>
                  <option value="">Any level</option>
                  {experienceOptions.map((e) => <option key={e} value={e}>{e}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Sort by">
              <Select name="sort" defaultValue={sort}>
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Button type="submit">Show jobs</Button>
            {filtersOn && <Link href={href({ q: "", category: "", type: "", experience: "", min: "", max: "" })} className="text-center text-sm text-ink-500 hover:text-ink-900">Clear filters</Link>}
          </form>
        </Card>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-ink-500">
            {list.length === 0 ? "No jobs" : `${list.length} job${list.length === 1 ? "" : "s"}`} · sorted by {SORTS[sort].toLowerCase()}
          </p>
          {list.length === 0 ? (
            tab === "saved" && !filtersOn ? (
              <EmptyState
                title="No saved jobs yet"
                body="Tap the bookmark on any job to keep it here while you think it over. Saved jobs that close drop off this list."
                action={<LinkButton href="/designer/jobs" variant="secondary">Browse open jobs</LinkButton>}
              />
            ) : filtersOn ? (
              <EmptyState
                icon={<SearchX size={28} />}
                title="No jobs match these filters"
                body="Try a broader search or remove a filter. New briefs are posted every day."
                action={<LinkButton href={href({ q: "", category: "", type: "", experience: "", min: "", max: "" })} variant="secondary">Clear filters</LinkButton>}
              />
            ) : (
              <EmptyState
                title="No open jobs right now"
                body="When clients publish briefs, they'll appear here ranked by how well they fit you. Meanwhile, sharpen your profile so you're ready."
                action={<LinkButton href="/designer/portfolio" variant="secondary">Add portfolio pieces</LinkButton>}
              />
            )
          ) : (
            list.map(({ job, fit }) => (
              <JobCard
                key={job.id}
                job={job}
                fit={fit}
                company={extras.company[job.client_id] ?? "A Talent Thread client"}
                applicants={extras.applicants[job.id] ?? 0}
                saved={savedIds.has(job.id)}
                applied={appliedIds.has(job.id)}
                mySkills={ctx.designer.skills}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
