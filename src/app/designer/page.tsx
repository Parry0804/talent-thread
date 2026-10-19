import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, Lock, Route, Sparkles, Wallet } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadFitContext } from "@/lib/matching/context";
import { jobExtras } from "@/components/designer-work/data";
import { JobCard } from "@/components/designer-work/job-card";
import { WelcomeChecklist } from "@/app/designer/_components/welcome-checklist";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/card";
import { MilestoneBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/format";
import type { Contract, Job, Milestone, Notification } from "@/lib/types";

export const metadata = { title: "Home" };

export default async function DesignerHome({ searchParams }: PageProps<"/designer">) {
  const viewer = await requireOnboarded("designer");
  const sp = await searchParams;
  const welcome = (Array.isArray(sp.welcome) ? sp.welcome[0] : sp.welcome) === "1";
  const supabase = await createClient();
  const first = viewer.full_name.split(" ")[0] || "there";

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [ctx, { count: reviewCount }, { data: myApps }, { count: portfolioCount }, { data: contractRows }, { data: notifRows }, { data: roadmap }, { data: monthPayouts }, { data: openJobs }] =
    await Promise.all([
      loadFitContext(viewer.id),
      supabase.from("ai_reviews").select("id", { count: "exact", head: true }).eq("designer_id", viewer.id).eq("status", "done"),
      supabase.from("applications").select("job_id").eq("designer_id", viewer.id),
      supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("designer_id", viewer.id),
      supabase.from("contracts").select("id, code, title, status").eq("designer_id", viewer.id).in("status", ["active", "disputed", "pending"]),
      supabase.from("notifications").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("roadmaps").select("id, weeks, created_at").eq("designer_id", viewer.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("payouts").select("net, status").eq("designer_id", viewer.id).gte("created_at", monthStart.toISOString()).neq("status", "failed"),
      supabase.from("jobs").select("*").eq("status", "open").order("published_at", { ascending: false, nullsFirst: false }).limit(100),
    ]);

  const appliedIds = new Set((myApps ?? []).map((a) => a.job_id as string));
  const contracts = (contractRows ?? []) as Pick<Contract, "id" | "code" | "title" | "status">[];
  const activeContracts = contracts.filter((c) => c.status === "active" || c.status === "disputed");
  const { data: msRows } = contracts.length
    ? await supabase.from("milestones").select("*").in("contract_id", contracts.map((c) => c.id)).order("seq")
    : { data: [] };
  const milestones = (msRows ?? []) as Milestone[];
  const inEscrow = milestones.filter((m) => ["funded", "submitted", "changes_requested"].includes(m.status)).reduce((s, m) => s + m.amount, 0);
  const upNext = milestones.filter((m) => m.status === "funded" || m.status === "changes_requested");
  const earnedMonth = (monthPayouts ?? []).reduce((s, p) => s + (p.net as number), 0);
  const notifications = (notifRows ?? []) as Notification[];

  const { data: taskRows } = roadmap
    ? await supabase.from("roadmap_tasks").select("done").eq("roadmap_id", roadmap.id)
    : { data: null };
  const tasksTotal = taskRows?.length ?? 0;
  const tasksDone = (taskRows ?? []).filter((t) => t.done).length;

  const forYou = ((openJobs ?? []) as Job[])
    .filter((j) => !appliedIds.has(j.id))
    .map((job) => ({ job, fit: ctx.score(job) }))
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 4);
  const extras = await jobExtras(forYou.map((f) => f.job));

  const d = ctx.designer;
  const firstRun = (reviewCount ?? 0) === 0 && appliedIds.size === 0;
  const profileDone = !!(d.headline && d.disciplines.length && d.skills.length >= 2 && d.hourly_rate);
  const cByID = new Map(contracts.map((c) => [c.id, c]));

  const jobsForYou = (
    <Card>
      <CardHeader title="Jobs for you" sub="Open briefs ranked by your fit." action={<Link href="/designer/jobs" className="text-sm text-ink-500 hover:text-ink-900">See all</Link>} />
      <CardBody className="flex flex-col gap-3">
        {forYou.length === 0 ? (
          <EmptyState title="No open jobs to match yet" body="As soon as clients publish briefs, the best fits for your skills and rate show up here." action={<LinkButton href="/designer/jobs" variant="secondary">Browse the marketplace</LinkButton>} />
        ) : (
          forYou.map(({ job, fit }) => (
            <JobCard key={job.id} job={job} fit={fit} company={extras.company[job.client_id] ?? "A Talent Thread client"} applicants={extras.applicants[job.id] ?? 0} mySkills={d.skills} compact />
          ))
        )}
      </CardBody>
    </Card>
  );

  if (firstRun) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title={welcome ? `Welcome to Talent Thread, ${first}!` : `Hi ${first}, let's get you hired`}
          sub={welcome ? "Your profile is live. Four quick steps and you'll be ready to send strong applications." : "Finish these steps so clients can find you and trust your work."}
        />
        <div className="flex flex-col gap-6">
          <WelcomeChecklist
            items={[
              { label: "Complete your profile", detail: "Headline, disciplines, skills and an hourly rate.", href: "/designer/profile", done: profileDone },
              { label: "Add 3 or more portfolio pieces", detail: `${portfolioCount ?? 0} of 3 added. Your best, most recent work.`, href: "/designer/portfolio", done: (portfolioCount ?? 0) >= 3 },
              { label: "Run your free AI review", detail: "Get a 0–100 score, a rate guide and what to improve next.", href: "/designer/analysis", done: (reviewCount ?? 0) > 0, ai: true },
              { label: "Apply to your first job", detail: "Pick a brief with a high fit score.", href: "/designer/jobs", done: appliedIds.size > 0 },
            ]}
          />
          {jobsForYou}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={welcome ? `Welcome, ${first}!` : `Hi ${first}`}
        sub={upNext.length ? `You have ${upNext.length} milestone${upNext.length === 1 ? "" : "s"} waiting for your work.` : "Here's what's happening with your work."}
        action={<LinkButton href="/designer/jobs">Find work</LinkButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="AI score"
          value={d.latest_score != null ? <span className="text-marigold-800">{d.latest_score}</span> : "—"}
          sub={d.latest_score != null ? (d.latest_band ?? "Out of 100") : <Link href="/designer/analysis" className="underline">Run your free review</Link>}
          icon={<Sparkles size={16} className="text-violet-500" />}
        />
        <Stat label="Active contracts" value={activeContracts.length} sub={<Link href="/contracts" className="hover:underline">View contracts</Link>} />
        <Stat label="In escrow for you" value={formatINR(inEscrow)} sub="Released when work is approved" icon={<Lock size={16} />} />
        <Stat label="Earned this month" value={formatINR(earnedMonth)} sub={<Link href="/designer/earnings" className="hover:underline">See earnings</Link>} icon={<Wallet size={16} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Up next" sub="Funded milestones and change requests that need your submission." />
            <CardBody>
              {upNext.length === 0 ? (
                <p className="text-sm text-ink-500">Nothing needs your submission right now. When a client funds a milestone or asks for changes, it shows up here.</p>
              ) : (
                <ul className="-mx-6 divide-y divide-paper-200">
                  {upNext.map((m) => {
                    const c = cByID.get(m.contract_id);
                    return (
                      <li key={m.id}>
                        <Link href={`/contracts/${m.contract_id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-paper-50">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-ink-900">{m.title}</div>
                            <div className="flex items-center gap-2 text-sm text-ink-500">
                              <span className="font-mono">{c?.code}</span>
                              <span className="truncate">{c?.title}</span>
                              {m.due_date && <span className="inline-flex items-center gap-1"><CalendarClock size={13} aria-hidden />Due {formatDate(m.due_date)}</span>}
                            </div>
                          </div>
                          <span className="hidden font-semibold tabular sm:inline">{formatINR(m.amount)}</span>
                          <MilestoneBadge status={m.status} />
                          <ArrowRight size={15} className="text-ink-400" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
          {jobsForYou}
        </div>

        <aside className="flex flex-col gap-6">
          {roadmap && (
            <Card className="p-5">
              <div className="flex items-center gap-2 font-semibold text-ink-900"><Route size={16} aria-hidden />Skill roadmap</div>
              <p className="mt-1 text-sm text-ink-500">{tasksDone} of {tasksTotal} tasks done · {roadmap.weeks}-week plan</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-100" aria-hidden>
                <div className="h-full rounded-full bg-marigold-500" style={{ width: `${tasksTotal ? (tasksDone / tasksTotal) * 100 : 0}%` }} />
              </div>
              <LinkButton href="/designer/roadmap" variant="secondary" size="sm" className="mt-4">Continue roadmap</LinkButton>
            </Card>
          )}
          <Card>
            <CardHeader title="Recent notifications" action={<Link href="/notifications" className="text-sm text-ink-500 hover:text-ink-900">All</Link>} />
            <CardBody>
              {notifications.length === 0 ? (
                <p className="flex items-start gap-2 text-sm text-ink-500"><Bell size={15} className="mt-0.5 shrink-0" aria-hidden />No notifications yet. Shortlists, offers and payments will show up here.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {notifications.map((n) => {
                    const body = (
                      <>
                        <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-marigold-500" aria-label="Unread" />}
                          {n.title}
                        </span>
                        <span className="block text-xs text-ink-500">{timeAgo(n.created_at)}</span>
                      </>
                    );
                    return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:underline">{body}</Link> : body}</li>;
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
