import Link from "next/link";
import { ArrowRight, Briefcase, Clock, FileSignature, Lock, Search, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { requireClient, loadDesigners } from "@/lib/client/data";
import { rankDesignersForJob } from "@/lib/client/matching";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ContractBadge, MilestoneBadge } from "@/components/ui/badge";
import { DesignerMiniCard } from "@/components/client/designer-mini-card";
import { formatBudget, formatINR } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import type { Application, Contract, Job, Milestone } from "@/lib/types";

export const metadata = { title: "Home" };

const IN_ESCROW = ["funded", "submitted", "changes_requested", "approved", "disputed"];

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000));
}

export default async function ClientHome({ searchParams }: PageProps<"/client">) {
  const { viewer, company, supabase } = await requireClient();
  const sp = await searchParams;
  const welcome = sp.welcome === "1";
  const first = viewer.full_name.split(" ")[0] || "there";

  const [{ data: jobRows }, { data: contractRows }] = await Promise.all([
    supabase.from("jobs").select("*").eq("client_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("contracts").select("*").eq("client_id", viewer.id).order("created_at", { ascending: false }),
  ]);
  const jobs = (jobRows ?? []) as Job[];
  const contracts = (contractRows ?? []) as Contract[];

  const greeting = (
    <PageHeader
      eyebrow={company.company_name || undefined}
      title={welcome ? `Welcome to Talent Thread, ${first}` : `Hi ${first}`}
      sub={welcome ? "Your account is ready. Post your first job and we'll line up designers who fit it." : "Here's what's happening with your jobs and contracts."}
      action={
        <div className="flex gap-2">
          <LinkButton href="/client/settings" variant="ghost">Company settings</LinkButton>
          <LinkButton href="/client/jobs/new" variant="primary"><Sparkles size={16} /> Post a job</LinkButton>
        </div>
      }
    />
  );

  if (!jobs.length && !contracts.length) {
    return (
      <div>
        {greeting}
        <Card className="overflow-hidden">
          <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">Start here</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Tell us what you need. We&apos;ll write the brief.</h2>
              <p className="mt-3 max-w-xl text-ink-500">
                Describe your project in a few sentences, in your own words. Our AI turns it into a clear brief with deliverables, skills, a realistic
                rupee budget and a timeline. You review every word before it goes live.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/client/jobs/new" variant="brand" size="lg"><Sparkles size={18} /> Post a job with AI</LinkButton>
                <LinkButton href="/client/designers" variant="secondary" size="lg"><Search size={18} /> Browse designers</LinkButton>
              </div>
            </div>
            <ul className="flex flex-col gap-4 text-sm">
              {[
                { icon: <Sparkles size={18} className="text-violet-600" />, t: "AI brief in under a minute", b: "Clear scope means better proposals and fewer surprises." },
                { icon: <Users size={18} className="text-ink-700" />, t: "Ranked applicants", b: "We sort proposals by how well each designer fits your job." },
                { icon: <ShieldCheck size={18} className="text-success-600" />, t: "Milestone escrow", b: "Pay into escrow per milestone. Money is released only when you approve." },
              ].map((x) => (
                <li key={x.t} className="flex gap-3 rounded-md bg-paper-50 p-4">
                  <span className="mt-0.5">{x.icon}</span>
                  <span><span className="block font-medium text-ink-900">{x.t}</span><span className="text-ink-500">{x.b}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    );
  }

  const contractIds = contracts.map((c) => c.id);
  const openJobs = jobs.filter((j) => j.status === "open");
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const [{ data: msRows }, { data: appRows }, { data: payRows }] = await Promise.all([
    contractIds.length
      ? supabase.from("milestones").select("*").in("contract_id", contractIds).order("seq")
      : Promise.resolve({ data: [] as Milestone[] }),
    openJobs.length
      ? supabase.from("applications").select("id, job_id, designer_id, status, created_at").in("job_id", openJobs.map((j) => j.id)).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Application[] }),
    supabase.from("payments").select("amount, platform_fee, gst, paid_at").eq("client_id", viewer.id).eq("status", "paid").gte("paid_at", yearStart),
  ]);
  const milestones = (msRows ?? []) as Milestone[];
  const apps = (appRows ?? []) as Pick<Application, "id" | "job_id" | "designer_id" | "status" | "created_at">[];

  const activeContracts = contracts.filter((c) => c.status === "active" || c.status === "disputed");
  const pendingOffers = contracts.filter((c) => c.status === "pending");
  const inEscrow = milestones.filter((m) => IN_ESCROW.includes(m.status)).reduce((s, m) => s + m.amount, 0);
  const spent = (payRows ?? []).reduce((s, p) => s + p.amount + p.platform_fee + p.gst, 0);
  const toReview = milestones.filter((m) => m.status === "submitted").sort((a, b) => (a.auto_approve_at ?? "").localeCompare(b.auto_approve_at ?? ""));
  const contractById = new Map(contracts.map((c) => [c.id, c]));

  const designers = await loadDesigners([...contracts.map((c) => c.designer_id), ...apps.map((a) => a.designer_id)]);
  const newByJob = new Map<string, number>();
  const appsByJob = new Map<string, typeof apps>();
  for (const a of apps) {
    if (a.status === "withdrawn") continue;
    if (a.status === "submitted") newByJob.set(a.job_id, (newByJob.get(a.job_id) ?? 0) + 1);
    appsByJob.set(a.job_id, [...(appsByJob.get(a.job_id) ?? []), a]);
  }

  const growth = company.plan === "growth";
  const latestJob = openJobs[0] ?? jobs.find((j) => j.status !== "draft") ?? null;
  const suggested = growth && latestJob ? await rankDesignersForJob(latestJob, 3, (appsByJob.get(latestJob.id) ?? []).map((a) => a.designer_id)) : [];

  const attention = toReview.length + pendingOffers.length + [...newByJob.values()].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-8">
      {greeting}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Open jobs" value={openJobs.length} icon={<Briefcase size={16} />} sub={`${jobs.filter((j) => j.status === "draft").length} draft(s)`} />
        <Stat label="Active contracts" value={activeContracts.length} icon={<FileSignature size={16} />} sub={pendingOffers.length ? `${pendingOffers.length} offer(s) waiting` : undefined} />
        <Stat label="In escrow" value={formatINR(inEscrow)} icon={<ShieldCheck size={16} />} sub="Held safely until you approve" />
        <Stat label="Spent this year" value={formatINR(spent)} icon={<Wallet size={16} />} sub="Including platform fee and GST" />
      </div>

      <Card>
        <CardHeader title="Needs your attention" sub={attention ? undefined : "Nothing waiting on you right now."} />
        <CardBody className="flex flex-col gap-2">
          {!attention && <p className="text-sm text-ink-500">When a designer submits work, replies to an offer or applies to your jobs, it shows up here.</p>}
          {toReview.map((m) => {
            const c = contractById.get(m.contract_id);
            const d = daysLeft(m.auto_approve_at);
            return (
              <Link key={m.id} href={`/contracts/${m.contract_id}`} className="flex flex-wrap items-center gap-3 rounded-md border border-paper-200 p-3 hover:border-ink-300">
                <Clock size={16} className="text-marigold-800" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">Review milestone {m.seq}: {m.title}</div>
                  <div className="text-xs text-ink-500">{c?.title} · {formatINR(m.amount)} · submitted {timeAgo(m.submitted_at)}</div>
                </div>
                <Badge tone="warning">{d === 0 ? "Auto-approves today" : `Auto-approves in ${d} day${d === 1 ? "" : "s"}`}</Badge>
                <ArrowRight size={16} className="text-ink-400" />
              </Link>
            );
          })}
          {pendingOffers.map((c) => (
            <Link key={c.id} href={`/contracts/${c.id}`} className="flex flex-wrap items-center gap-3 rounded-md border border-paper-200 p-3 hover:border-ink-300">
              <FileSignature size={16} className="text-ink-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">Offer to {designers.get(c.designer_id)?.name ?? "designer"}: {c.title}</div>
                <div className="text-xs text-ink-500">{formatINR(c.total_amount)} · sent {timeAgo(c.created_at)} · waiting for them to accept</div>
              </div>
              <ContractBadge status={c.status} />
            </Link>
          ))}
          {openJobs.filter((j) => newByJob.get(j.id)).map((j) => (
            <Link key={j.id} href={`/client/jobs/${j.id}/applicants`} className="flex flex-wrap items-center gap-3 rounded-md border border-paper-200 p-3 hover:border-ink-300">
              <Users size={16} className="text-violet-600" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{newByJob.get(j.id)} new applicant{newByJob.get(j.id) === 1 ? "" : "s"} for {j.title}</div>
                <div className="text-xs text-ink-500">Ranked by fit. Shortlist or decline to keep things moving.</div>
              </div>
              <ArrowRight size={16} className="text-ink-400" />
            </Link>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Your open jobs" action={<Link href="/client/jobs" className="text-sm font-medium text-ink-600 hover:text-ink-900">All jobs</Link>} />
          <CardBody className="flex flex-col gap-3">
            {!openJobs.length && (
              <EmptyState title="No open jobs" body="Jobs you publish appear here with their applicants." action={<LinkButton href="/client/jobs/new" size="sm">Post a job</LinkButton>} />
            )}
            {openJobs.slice(0, 5).map((j) => {
              const list = appsByJob.get(j.id) ?? [];
              return (
                <Link key={j.id} href={`/client/jobs/${j.id}/applicants`} className="flex items-center gap-4 rounded-md border border-paper-200 p-3 hover:border-ink-300">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{j.title}</div>
                    <div className="text-xs text-ink-500">{j.category} · {formatBudget(j.budget_min, j.budget_max, j.budget_type)} · posted {timeAgo(j.published_at)}</div>
                  </div>
                  <div className="flex items-center">
                    {list.slice(0, 4).map((a, i) => {
                      const d = designers.get(a.designer_id);
                      return <Avatar key={a.id} name={d?.name} src={d?.avatar} size={28} className={i ? "-ml-2 ring-2 ring-paper-0" : "ring-2 ring-paper-0"} />;
                    })}
                    <span className="ml-2 text-xs text-ink-500 tabular">{list.length ? `${list.length} applicant${list.length === 1 ? "" : "s"}` : "No applicants yet"}</span>
                  </div>
                </Link>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Active contracts" action={<Link href="/contracts" className="text-sm font-medium text-ink-600 hover:text-ink-900">All contracts</Link>} />
          <CardBody className="flex flex-col gap-3">
            {!activeContracts.length && (
              <EmptyState title="No active contracts" body="When a designer accepts your offer, the contract and its current milestone show here." />
            )}
            {activeContracts.slice(0, 5).map((c) => {
              const ms = milestones.filter((m) => m.contract_id === c.id);
              const current = ms.find((m) => m.status !== "released" && m.status !== "refunded");
              const d = designers.get(c.designer_id);
              return (
                <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center gap-3 rounded-md border border-paper-200 p-3 hover:border-ink-300">
                  <Avatar name={d?.name} src={d?.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="truncate text-xs text-ink-500">
                      <span className="font-mono">{c.code}</span> · {d?.name} · {current ? `Milestone ${current.seq} of ${ms.length}: ${current.title}` : "All milestones done"}
                    </div>
                  </div>
                  {current ? <MilestoneBadge status={current.status} /> : <ContractBadge status={c.status} />}
                </Link>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {latestJob && (
        <Card>
          <CardHeader
            title={<span className="inline-flex items-center gap-2"><Sparkles size={16} className="text-violet-600" /> Suggested designers for your latest job</span>}
            sub={latestJob.title}
          />
          <CardBody>
            {growth ? (
              suggested.length ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {suggested.map((d) => <DesignerMiniCard key={d.id} d={d} inviteJobId={latestJob.status === "open" ? latestJob.id : undefined} />)}
                </div>
              ) : (
                <p className="text-sm text-ink-500">No available designers match this job yet. As more designers join, our picks appear here.</p>
              )
            ) : (
              <div className="relative overflow-hidden rounded-md border border-dashed border-violet-200 bg-violet-50/50 p-6">
                <div className="grid gap-4 opacity-40 blur-[2px] md:grid-cols-3" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md bg-paper-0 p-4">
                      <div className="h-10 w-10 rounded-full bg-violet-100" />
                      <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-paper-200" /><div className="h-3 w-1/2 rounded bg-paper-100" /></div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <Lock size={18} className="text-violet-600" />
                  <p className="font-medium">AI talent picks are part of Growth</p>
                  <p className="max-w-sm text-sm text-ink-500">See the three best-fit designers for every job you post, before anyone applies.</p>
                  <LinkButton href="/client/plan" variant="brand" size="sm"><Sparkles size={14} /> See Growth</LinkButton>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
