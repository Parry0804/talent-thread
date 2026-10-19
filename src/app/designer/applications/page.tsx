import Link from "next/link";
import { ChevronRight, Mail } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobExtras } from "@/components/designer-work/data";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ApplicationBadge, Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { formatBudget, formatINR } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Application, Job } from "@/lib/types";

export const metadata = { title: "Applications" };

const TABS = { active: "Active", invites: "Invites", archived: "Archived" } as const;
type Tab = keyof typeof TABS;
const ACTIVE = ["submitted", "shortlisted", "hired"];

export default async function ApplicationsPage({ searchParams }: PageProps<"/designer/applications">) {
  const viewer = await requireOnboarded("designer");
  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "active";
  const supabase = await createClient();

  const [{ data: appRows }, { data: inviteRows }] = await Promise.all([
    supabase.from("applications").select("*").eq("designer_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("invites").select("id, job_id, message, created_at").eq("designer_id", viewer.id).order("created_at", { ascending: false }),
  ]);
  const apps = (appRows ?? []) as Application[];
  const appliedJobIds = new Set(apps.map((a) => a.job_id));
  const invites = (inviteRows ?? []).filter((i) => !appliedJobIds.has(i.job_id));
  const jobIds = [...new Set([...apps.map((a) => a.job_id), ...invites.map((i) => i.job_id)])];
  const { data: jobRows } = jobIds.length ? await supabase.from("jobs").select("*").in("id", jobIds) : { data: [] };
  const jobs = new Map(((jobRows ?? []) as Job[]).map((j) => [j.id, j]));
  const extras = await jobExtras([...jobs.values()]);

  const active = apps.filter((a) => ACTIVE.includes(a.status));
  const archived = apps.filter((a) => !ACTIVE.includes(a.status));
  const counts: Record<Tab, number> = { active: active.length, invites: invites.length, archived: archived.length };
  const rows = tab === "active" ? active : archived;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Applications" sub="Track every proposal you've sent and the jobs clients have invited you to." action={<LinkButton href="/designer/jobs">Find jobs to apply for</LinkButton>} />

      <div className="mb-5 flex items-center gap-1 border-b border-paper-200">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={t === "active" ? "/designer/applications" : `/designer/applications?tab=${t}`}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", tab === t ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800")}
          >
            {TABS[t]} <span className="ml-1 text-ink-400 tabular">{counts[t]}</span>
          </Link>
        ))}
      </div>

      {tab === "invites" ? (
        invites.length === 0 ? (
          <EmptyState icon={<Mail size={28} />} title="No invites yet" body="When a client likes your profile and invites you to their job, it shows up here. A strong AI score and 3+ portfolio pieces help clients find you." action={<LinkButton href="/designer/portfolio" variant="secondary">Polish your portfolio</LinkButton>} />
        ) : (
          <div className="flex flex-col gap-3">
            {invites.map((i) => {
              const job = jobs.get(i.job_id);
              if (!job) return null;
              return (
                <Card key={i.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <Link href={`/designer/jobs/${job.id}`} className="font-semibold text-ink-900 hover:underline">{job.title}</Link>
                    <p className="text-sm text-ink-500">{extras.company[job.client_id]} · invited {timeAgo(i.created_at)} · {formatBudget(job.budget_min, job.budget_max, job.budget_type)}</p>
                    {i.message && <p className="mt-1 line-clamp-1 text-sm text-ink-700">&ldquo;{i.message}&rdquo;</p>}
                  </div>
                  {job.status === "open" ? (
                    <LinkButton href={`/designer/jobs/${job.id}#apply`} size="sm">View brief and apply</LinkButton>
                  ) : (
                    <Badge>Job closed</Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )
      ) : rows.length === 0 ? (
        tab === "active" ? (
          <EmptyState title="No active applications" body="Applications you send appear here with their status, from submitted to shortlisted to hired. Start with a job that fits you well." action={<LinkButton href="/designer/jobs">Browse jobs</LinkButton>} />
        ) : (
          <EmptyState title="Nothing archived" body="Applications you withdraw, or that clients don't take forward, move here so your active list stays focused." />
        )
      ) : (
        <Card className="divide-y divide-paper-200">
          {rows.map((a) => {
            const job = jobs.get(a.job_id);
            return (
              <Link key={a.id} href={`/designer/applications/${a.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper-50">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-900">{job?.title ?? "Job removed"}</div>
                  <div className="text-sm text-ink-500">
                    {job ? extras.company[job.client_id] : "—"} · applied {timeAgo(a.created_at)} · you proposed {formatINR(a.proposed_amount)}
                  </div>
                </div>
                {a.fit_score != null && <span className="hidden text-sm text-violet-600 tabular sm:inline">{a.fit_score}% fit</span>}
                <ApplicationBadge status={a.status} />
                <ChevronRight size={16} className="text-ink-400" aria-hidden />
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
