import Link from "next/link";
import { Inbox, Sparkles } from "lucide-react";
import { getOwnedJob, requireClient } from "@/lib/client/data";
import { rankedApplicants } from "@/lib/client/applicants";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ApplicationBadge, Badge, JobBadge } from "@/components/ui/badge";
import { BandBadge } from "@/components/ui/score";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmergingTag } from "@/components/client/designer-mini-card";
import { declineApplicant, shortlistApplicant, unshortlistApplicant } from "@/app/client/jobs/[id]/applicants/actions";
import { formatBudget, formatINR } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { EMERGING_CONTRACTS } from "@/lib/client/matching";
import { cn } from "@/lib/cn";

export const metadata = { title: "Applicants" };

export default async function ApplicantsPage({ params, searchParams }: PageProps<"/client/jobs/[id]/applicants">) {
  const { viewer } = await requireClient();
  const { id } = await params;
  const sp = await searchParams;
  const job = await getOwnedJob(id, viewer.id);
  const all = await rankedApplicants(job);
  const filter = sp.filter === "shortlisted" ? "shortlisted" : "all";
  const list = filter === "shortlisted" ? all.filter((a) => a.app.status === "shortlisted") : all;
  const shortlisted = all.filter((a) => a.app.status === "shortlisted").length;

  return (
    <div>
      <PageHeader
        eyebrow="Applicants"
        title={job.title}
        sub={<span className="inline-flex flex-wrap items-center gap-2">{formatBudget(job.budget_min, job.budget_max, job.budget_type)} · <JobBadge status={job.status} /> · ranked by how well each designer fits this job</span>}
        action={
          <div className="flex gap-2">
            <LinkButton href={`/client/jobs/${job.id}/preview`} variant="secondary">View job</LinkButton>
            {job.status === "open" && <LinkButton href={`/client/jobs/${job.id}/published`} variant="secondary"><Sparkles size={16} /> Invite designers</LinkButton>}
          </div>
        }
      />

      <nav className="mb-5 flex gap-2" aria-label="Filter applicants">
        {[
          { key: "all", label: `All (${all.length})` },
          { key: "shortlisted", label: `Shortlisted (${shortlisted})` },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/client/jobs/${job.id}/applicants${t.key === "all" ? "" : "?filter=shortlisted"}`}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm", filter === t.key ? "border-ink-900 bg-ink-900 text-paper-50" : "border-paper-200 bg-paper-0 text-ink-700 hover:border-ink-300")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!list.length ? (
        <EmptyState
          icon={<Inbox size={28} />}
          title={filter === "shortlisted" ? "No one shortlisted yet" : job.status === "draft" ? "This job isn't published yet" : "No applicants yet"}
          body={
            filter === "shortlisted"
              ? "Shortlist the proposals you like from the All tab to compare them here."
              : job.status === "draft"
                ? "Publish the job so designers can find it and send proposals."
                : "Proposals appear here as designers apply, ranked by fit. Inviting a few matching designers usually gets the first replies within a day."
          }
          action={
            job.status === "draft" ? <LinkButton href={`/client/jobs/${job.id}/preview`} size="sm">Preview and publish</LinkButton>
            : job.status === "open" && filter === "all" ? <LinkButton href={`/client/jobs/${job.id}/published`} size="sm" variant="brand"><Sparkles size={14} /> See matching designers</LinkButton>
            : null
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {list.map(({ app, designer, fit, reasons, completed }) => {
            const p = designer?.profile;
            const hidden = { job_id: job.id, app_id: app.id };
            const closed = ["hired", "withdrawn"].includes(app.status);
            return (
              <Card key={app.id} className={cn("p-5 sm:p-6", app.status === "rejected" && "opacity-60")}>
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar name={designer?.name} src={designer?.avatar} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/client/jobs/${job.id}/applicants/${app.id}`} className="font-semibold hover:underline">{designer?.name ?? "Designer"}</Link>
                      {completed < EMERGING_CONTRACTS && <EmergingTag />}
                      <ApplicationBadge status={app.status} />
                    </div>
                    <p className="truncate text-sm text-ink-500">{p?.headline || "Designer"}{designer?.city ? ` · ${designer.city}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-sm font-semibold text-violet-600 tabular">
                      <Sparkles size={13} aria-hidden /> {fit}% fit
                    </span>
                    {p?.score_public && p.latest_score != null && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">AI portfolio score <span className="font-mono font-semibold text-ink-900">{p.latest_score}</span> <BandBadge score={p.latest_score} /></span>
                    )}
                  </div>
                </div>

                {reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">{reasons.slice(0, 4).map((r) => <Badge key={r} tone="brand">{r}</Badge>)}</div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-[auto_auto_1fr]">
                  <div><div className="text-xs text-ink-500">Proposed</div><div className="font-display text-lg font-semibold tabular">{formatINR(app.proposed_amount)}</div></div>
                  <div><div className="text-xs text-ink-500">Timeline</div><div className="font-display text-lg font-semibold tabular">{app.timeline_days ? `${app.timeline_days} days` : "Not given"}</div></div>
                  <p className="line-clamp-3 text-sm text-ink-700 sm:border-l sm:border-paper-200 sm:pl-4">{app.cover_letter}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-paper-200 pt-4">
                  <span className="mr-auto text-xs text-ink-500">Applied {timeAgo(app.created_at)}</span>
                  {!closed && app.status !== "rejected" && (
                    app.status === "shortlisted" ? (
                      <form action={unshortlistApplicant}>{Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}<SubmitButton size="sm" variant="ghost" pending="…">Remove from shortlist</SubmitButton></form>
                    ) : (
                      <form action={shortlistApplicant}>{Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}<SubmitButton size="sm" variant="secondary" pending="Shortlisting…">Shortlist</SubmitButton></form>
                    )
                  )}
                  {!closed && app.status !== "rejected" && (
                    <form action={declineApplicant}>{Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}<SubmitButton size="sm" variant="ghost" pending="Declining…">Decline</SubmitButton></form>
                  )}
                  <LinkButton href={`/client/jobs/${job.id}/applicants/${app.id}`} size="sm">View proposal</LinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
