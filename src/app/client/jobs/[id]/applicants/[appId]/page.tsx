import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { getOwnedJob, requireClient } from "@/lib/client/data";
import { rankedApplicants } from "@/lib/client/applicants";
import { EMERGING_CONTRACTS } from "@/lib/client/matching";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ApplicationBadge, Badge } from "@/components/ui/badge";
import { BandBadge } from "@/components/ui/score";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmergingTag } from "@/components/client/designer-mini-card";
import { declineApplicant, shortlistApplicant } from "@/app/client/jobs/[id]/applicants/actions";
import { publicUrl } from "@/lib/storage";
import { formatINR } from "@/lib/money";
import { experienceLabel } from "@/lib/options";
import { timeAgo } from "@/lib/format";
import type { PortfolioItem } from "@/lib/types";

export const metadata = { title: "Proposal" };

const availabilityLabel = { available: "Available now", limited: "Limited availability", unavailable: "Not taking work" } as const;

export default async function ApplicationPage({ params }: PageProps<"/client/jobs/[id]/applicants/[appId]">) {
  const { viewer, supabase } = await requireClient();
  const { id, appId } = await params;
  const job = await getOwnedJob(id, viewer.id);
  const ranked = await rankedApplicants(job);
  const entry = ranked.find((r) => r.app.id === appId);
  if (!entry) notFound();
  const { app, designer, fit, reasons, completed } = entry;
  const p = designer?.profile;
  const name = designer?.name ?? "this designer";
  const first = name.split(" ")[0];

  const { data: items } = app.portfolio_item_ids.length
    ? await supabase.from("portfolio_items").select("*").in("id", app.portfolio_item_ids)
    : { data: [] };
  const portfolio = ((items ?? []) as PortfolioItem[]).sort((a, b) => app.portfolio_item_ids.indexOf(a.id) - app.portfolio_item_ids.indexOf(b.id));
  const canAct = app.status === "submitted" || app.status === "shortlisted";
  const hidden = (
    <>
      <input type="hidden" name="job_id" value={job.id} />
      <input type="hidden" name="app_id" value={app.id} />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/client/jobs/${job.id}/applicants`} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> All applicants for {job.title}</Link>

      <div className="flex flex-wrap items-start gap-5">
        <Avatar name={name} src={designer?.avatar} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{name}</h1>
            {completed < EMERGING_CONTRACTS && <EmergingTag />}
            <ApplicationBadge status={app.status} />
          </div>
          <p className="mt-1 text-ink-500">{p?.headline || "Designer"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAct && app.status !== "shortlisted" && <form action={shortlistApplicant}>{hidden}<SubmitButton variant="secondary" pending="Shortlisting…">Shortlist</SubmitButton></form>}
          {canAct && <form action={declineApplicant}>{hidden}<SubmitButton variant="ghost" pending="Declining…">Decline</SubmitButton></form>}
          {canAct && <LinkButton href={`/client/jobs/${job.id}/applicants/${app.id}/hire`}>Hire {first}</LinkButton>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Proposal" sub={`Sent ${timeAgo(app.created_at)}`} />
            <CardBody>
              <div className="mb-5 grid grid-cols-2 gap-4 rounded-md bg-paper-50 p-4 sm:grid-cols-3">
                <div><div className="text-xs text-ink-500">Proposed amount</div><div className="font-display text-xl font-semibold tabular">{formatINR(app.proposed_amount)}</div></div>
                <div><div className="text-xs text-ink-500">Timeline</div><div className="font-display text-xl font-semibold tabular">{app.timeline_days ? `${app.timeline_days} days` : "Not given"}</div></div>
                <div><div className="text-xs text-ink-500">Your budget</div><div className="text-sm font-medium tabular">{formatINR(job.budget_min)}–{formatINR(job.budget_max)}</div></div>
              </div>
              <div className="whitespace-pre-line text-[15px] leading-relaxed text-ink-800">{app.cover_letter}</div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Work they attached" sub="Projects the designer picked as most relevant to your job." />
            <CardBody>
              {!portfolio.length ? (
                <EmptyState title="No projects attached" body={`${first} didn't attach specific projects. Their full portfolio is on their public profile.`} />
              ) : (
                <div className="flex flex-col gap-6">
                  {portfolio.map((item) => (
                    <div key={item.id}>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge>{item.category}</Badge>
                        {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900">Live link <ExternalLink size={12} /></a>}
                      </div>
                      {item.description && <p className="mt-1 text-sm text-ink-600">{item.description}</p>}
                      {item.image_paths.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {item.image_paths.map((path) => {
                            const src = publicUrl("portfolio", path);
                            return src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={path} src={src} alt={item.title} className="w-full rounded-md border border-paper-200 object-cover" loading="lazy" />
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-violet-200">
            <CardHeader title={<span className="inline-flex items-center gap-2 text-violet-700"><Sparkles size={16} /> {fit}% fit for this job</span>} />
            <CardBody>
              {reasons.length ? (
                <ul className="flex flex-col gap-1.5 text-sm text-ink-700">{reasons.map((r) => <li key={r}>· {r}</li>)}</ul>
              ) : (
                <p className="text-sm text-ink-500">Low overlap with the skills and category you picked.</p>
              )}
              <p className="mt-3 text-xs text-ink-500">Fit compares skills, discipline, rate and availability with your brief. Designers with fewer than {EMERGING_CONTRACTS} contracts get a small boost so new talent gets seen.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="About the designer" />
            <CardBody className="flex flex-col gap-3 text-sm">
              {p?.score_public && p.latest_score != null && (
                <div className="flex items-center justify-between"><span className="text-ink-500">AI portfolio score</span><span className="flex items-center gap-2"><span className="font-mono font-semibold">{p.latest_score}</span><BandBadge score={p.latest_score} /></span></div>
              )}
              {p && <div className="flex justify-between"><span className="text-ink-500">Availability</span><span>{availabilityLabel[p.availability]}</span></div>}
              {p?.hourly_rate ? <div className="flex justify-between"><span className="text-ink-500">Hourly rate</span><span className="tabular">{formatINR(p.hourly_rate)}/hr</span></div> : null}
              {p && <div className="flex justify-between"><span className="text-ink-500">Experience</span><span>{experienceLabel(p.years_experience)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-500">Completed contracts</span><span className="tabular">{completed}</span></div>
              {designer?.city && <div className="flex justify-between"><span className="text-ink-500">City</span><span className="inline-flex items-center gap-1"><MapPin size={12} /> {designer.city}</span></div>}
              {p?.bio && <p className="border-t border-paper-200 pt-3 text-ink-700">{p.bio}</p>}
              {p?.skills.length ? <div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <Badge key={s} tone={job.skills.includes(s) ? "brand" : "neutral"}>{s}</Badge>)}</div> : null}
              {p?.slug && <LinkButton href={`/d/${p.slug}`} variant="secondary" size="sm" className="mt-2 self-start">View full profile</LinkButton>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
