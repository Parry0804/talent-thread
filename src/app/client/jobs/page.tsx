import Link from "next/link";
import { Briefcase, Sparkles } from "lucide-react";
import { requireClient } from "@/lib/client/data";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { JobBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { closeJob, deleteDraft, reopenJob } from "@/app/client/jobs/actions";
import { formatBudget } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Job } from "@/lib/types";

export const metadata = { title: "My jobs" };

const TABS = [
  { key: "open", label: "Open", statuses: ["open"] },
  { key: "drafts", label: "Drafts", statuses: ["draft"] },
  { key: "closed", label: "Closed / Filled", statuses: ["closed", "filled"] },
] as const;

const EMPTY: Record<string, { title: string; body: string }> = {
  open: { title: "No open jobs", body: "Jobs you publish show up here with their applicants. Post one and we'll suggest designers who fit." },
  drafts: { title: "No drafts", body: "Jobs you start but haven't published are saved here." },
  closed: { title: "Nothing closed or filled yet", body: "When you hire someone or close a job, it moves here." },
};

export default async function MyJobsPage({ searchParams }: PageProps<"/client/jobs">) {
  const { viewer, supabase } = await requireClient();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];

  const { data: rows } = await supabase.from("jobs").select("*").eq("client_id", viewer.id).order("created_at", { ascending: false });
  const all = (rows ?? []) as Job[];
  const jobs = all.filter((j) => (tab.statuses as readonly string[]).includes(j.status));
  const ids = all.filter((j) => j.status !== "draft").map((j) => j.id);
  const { data: apps } = ids.length ? await supabase.from("applications").select("job_id, status").in("job_id", ids) : { data: [] };
  const counts = new Map<string, { total: number; fresh: number; shortlisted: number }>();
  for (const a of apps ?? []) {
    if (a.status === "withdrawn") continue;
    const c = counts.get(a.job_id) ?? { total: 0, fresh: 0, shortlisted: 0 };
    c.total++;
    if (a.status === "submitted") c.fresh++;
    if (a.status === "shortlisted") c.shortlisted++;
    counts.set(a.job_id, c);
  }

  return (
    <div>
      <PageHeader title="My jobs" sub="Everything you've posted, with applicants at a glance." action={<LinkButton href="/client/jobs/new"><Sparkles size={16} /> Post a job</LinkButton>} />
      {sp.error === "1" && <p className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">We couldn&apos;t start a new draft. Please try again.</p>}

      <nav className="mb-5 flex gap-1 border-b border-paper-200" aria-label="Job status">
        {TABS.map((t) => {
          const n = all.filter((j) => (t.statuses as readonly string[]).includes(j.status)).length;
          return (
            <Link
              key={t.key}
              href={`/client/jobs?tab=${t.key}`}
              className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", t.key === tab.key ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800")}
            >
              {t.label} <span className="ml-1 text-ink-400 tabular">{n}</span>
            </Link>
          );
        })}
      </nav>

      {!jobs.length ? (
        <EmptyState icon={<Briefcase size={28} />} {...EMPTY[tab.key]} action={<LinkButton href="/client/jobs/new" size="sm"><Sparkles size={14} /> Post a job with AI</LinkButton>} />
      ) : (
        <Card className="divide-y divide-paper-200">
          {jobs.map((j) => {
            const c = counts.get(j.id);
            const main = j.status === "draft" ? `/client/jobs/${j.id}/edit` : `/client/jobs/${j.id}/applicants`;
            return (
              <div key={j.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={main} className="truncate font-medium hover:underline">{j.title}</Link>
                    <JobBadge status={j.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {j.category} · {j.budget_min || j.budget_max ? formatBudget(j.budget_min, j.budget_max, j.budget_type) : "No budget yet"} ·{" "}
                    {j.status === "draft" ? `started ${timeAgo(j.created_at)}` : `published ${formatDate(j.published_at)}`}
                  </div>
                </div>
                {j.status !== "draft" && (
                  <Link href={`/client/jobs/${j.id}/applicants`} className="text-sm text-ink-600 tabular hover:text-ink-900">
                    <span className="font-semibold text-ink-900">{c?.total ?? 0}</span> applicant{c?.total === 1 ? "" : "s"}
                    {c?.fresh ? <span className="ml-1 text-violet-600">· {c.fresh} new</span> : null}
                    {c?.shortlisted ? <span className="ml-1">· {c.shortlisted} shortlisted</span> : null}
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  {j.status === "draft" && (
                    <>
                      <LinkButton href={`/client/jobs/${j.id}/edit`} size="sm" variant="secondary">Continue</LinkButton>
                      <form action={deleteDraft}><input type="hidden" name="id" value={j.id} /><SubmitButton size="sm" variant="ghost" pending="Deleting…">Delete</SubmitButton></form>
                    </>
                  )}
                  {j.status === "open" && (
                    <>
                      <LinkButton href={`/client/jobs/${j.id}/preview`} size="sm" variant="ghost">View</LinkButton>
                      <form action={closeJob}><input type="hidden" name="id" value={j.id} /><SubmitButton size="sm" variant="secondary" pending="Closing…">Close job</SubmitButton></form>
                    </>
                  )}
                  {j.status === "closed" && (
                    <form action={reopenJob}><input type="hidden" name="id" value={j.id} /><SubmitButton size="sm" variant="secondary" pending="Reopening…">Reopen</SubmitButton></form>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
