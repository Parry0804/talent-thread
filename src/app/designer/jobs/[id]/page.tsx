import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, CheckCircle2, MapPin, Paperclip, Sparkles, Wallet } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadFitContext } from "@/lib/matching/context";
import { publicUrl } from "@/lib/storage";
import { formatBudget, formatINR } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ApplicationBadge, Badge, JobBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { SkillChips } from "@/components/designer-work/skill-chips";
import { SaveJobButton } from "@/components/designer-work/save-job-button";
import { ApplyForm } from "@/components/designer-work/apply-form";
import type { Application, ClientProfile, Job, PortfolioItem, Profile } from "@/lib/types";

export const metadata = { title: "Job details" };

export default async function JobDetailPage({ params, searchParams }: PageProps<"/designer/jobs/[id]">) {
  const viewer = await requireOnboarded("designer");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data: jobRow } = await supabase.from("jobs").select("*").eq("id", id).single();
  const job = jobRow as Job | null;
  if (!job || job.status === "draft") notFound();

  const svc = createServiceClient();
  const [ctx, { data: cp }, { data: owner }, { count: jobsPosted }, { count: hires }, { data: appRow }, { data: saved }, { data: items }, { data: invite }, { count: priorContracts }, { count: applicants }] =
    await Promise.all([
      loadFitContext(viewer.id),
      supabase.from("client_profiles").select("*").eq("id", job.client_id).single(),
      supabase.from("profiles").select("full_name, city, created_at").eq("id", job.client_id).single(),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", job.client_id).in("status", ["open", "filled", "closed"]),
      svc.from("contracts").select("id", { count: "exact", head: true }).eq("client_id", job.client_id).in("status", ["active", "completed", "disputed"]),
      supabase.from("applications").select("*").eq("job_id", id).eq("designer_id", viewer.id).maybeSingle(),
      supabase.from("saved_jobs").select("job_id").eq("job_id", id).eq("designer_id", viewer.id).maybeSingle(),
      supabase.from("portfolio_items").select("*").eq("designer_id", viewer.id).order("sort"),
      supabase.from("invites").select("message, created_at").eq("job_id", id).eq("designer_id", viewer.id).maybeSingle(),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("client_id", job.client_id).eq("designer_id", viewer.id).in("status", ["active", "completed"]),
      svc.from("applications").select("id", { count: "exact", head: true }).eq("job_id", id).neq("status", "withdrawn"),
    ]);
  const client = cp as ClientProfile | null;
  const ownerP = owner as Pick<Profile, "full_name" | "city" | "created_at"> | null;
  const app = appRow as Application | null;
  const portfolio = (items ?? []) as PortfolioItem[];
  const fit = ctx.score(job);
  const justApplied = one(sp.applied) === "1" && !!app;
  const company = client?.company_name || "A Talent Thread client";

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/designer/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={15} aria-hidden /> Back to jobs
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{job.category}</Badge>
                  {job.status !== "open" && <JobBadge status={job.status} />}
                  {job.experience_level && <Badge>{job.experience_level}</Badge>}
                </div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">{job.title}</h1>
                <p className="mt-1.5 text-sm text-ink-500">
                  {company} · posted {timeAgo(job.published_at ?? job.created_at)} · {applicants ?? 0} applicant{applicants === 1 ? "" : "s"}
                </p>
              </div>
              <SaveJobButton jobId={job.id} saved={!!saved} withLabel />
            </div>

            <dl className="mt-6 grid gap-4 border-y border-paper-200 py-5 sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink-500"><Wallet size={13} aria-hidden />Budget</dt>
                <dd className="mt-1 font-display text-xl font-semibold tabular">{formatBudget(job.budget_min, job.budget_max, job.budget_type)}</dd>
                <dd className="text-xs text-ink-500">{job.budget_type === "hourly" ? "Hourly rate" : "Fixed price"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink-500"><CalendarClock size={13} aria-hidden />Timeline</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{job.timeline_weeks ? `${job.timeline_weeks} week${job.timeline_weeks === 1 ? "" : "s"}` : "Flexible"}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-ink-500"><MapPin size={13} aria-hidden />Location</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{job.location_pref || "Remote"}</dd>
              </div>
            </dl>

            <h2 className="mt-6 font-semibold text-ink-900">About the project</h2>
            <p className="mt-2 whitespace-pre-line text-ink-700">{job.description || "The client hasn't added a description yet."}</p>

            {job.deliverables.length > 0 && (
              <>
                <h2 className="mt-6 font-semibold text-ink-900">Deliverables</h2>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {job.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-ink-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ink-400" aria-hidden />{d}</li>
                  ))}
                </ul>
              </>
            )}

            {job.skills.length > 0 && (
              <>
                <h2 className="mt-6 font-semibold text-ink-900">Skills needed</h2>
                <div className="mt-2"><SkillChips skills={job.skills} highlight={ctx.designer.skills} /></div>
                <p className="mt-1.5 text-xs text-ink-500">Dark chips are skills on your profile.</p>
              </>
            )}

            {job.attachment_paths.length > 0 && (
              <p className="mt-6 flex items-center gap-2 text-sm text-ink-500">
                <Paperclip size={14} aria-hidden />
                {job.attachment_paths.length} reference file{job.attachment_paths.length === 1 ? "" : "s"} attached. The client will share them once you&apos;re shortlisted.
              </p>
            )}
          </Card>

          <section id="apply">
            {app ? (
              <AppliedPanel app={app} justApplied={justApplied} />
            ) : job.status !== "open" ? (
              <Card className="p-6 text-ink-600">This job is no longer taking applications.</Card>
            ) : portfolio.length === 0 ? (
              <Card className="p-6">
                <h2 className="font-semibold text-ink-900">Apply for this job</h2>
                <p className="mt-1 text-sm text-ink-500">Applications include 1–3 portfolio pieces so the client can see your work. Add your first piece, then come back here.</p>
                <LinkButton href="/designer/portfolio" className="mt-4">Add a portfolio piece</LinkButton>
              </Card>
            ) : (
              <Card>
                <CardHeader title="Apply now" sub={invite ? "You were invited to this job, so the client will see your application first." : "Tell the client how you'd approach their brief."} />
                <CardBody>
                  <ApplyForm
                    jobId={job.id}
                    suggestedAmount={job.budget_type === "fixed" ? job.budget_max || job.budget_min : 0}
                    suggestedDays={job.timeline_weeks ? job.timeline_weeks * 7 : null}
                    repeatHire={(priorContracts ?? 0) > 0}
                    items={portfolio.map((p) => ({ id: p.id, title: p.title, category: p.category, thumb: publicUrl("portfolio", p.image_paths[0]) }))}
                  />
                </CardBody>
              </Card>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-600"><Sparkles size={15} aria-hidden />Your fit</div>
            <div className="mt-2 font-display text-4xl font-semibold tabular text-ink-900">{fit.score}%</div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink-700">
              {fit.reasons.length ? fit.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-violet-500" aria-hidden />{r}</li>
              )) : <li className="text-ink-500">Few signals match yet. Adding skills and a rate to your profile sharpens this.</li>}
            </ul>
            <p className="mt-3 text-xs text-ink-500">Based on your skills, disciplines, rate, availability and AI score. Only you see this.</p>
          </Card>

          {invite && (
            <Card className="border-marigold-300 bg-marigold-50 p-5">
              <p className="text-sm font-semibold text-ink-900">You&apos;ve been invited</p>
              <p className="mt-1 text-sm text-ink-700">{invite.message ? `“${invite.message}”` : `${company} would like you to apply.`}</p>
              <p className="mt-2 text-xs text-ink-500">{timeAgo(invite.created_at)}</p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Building2 size={15} aria-hidden />About the client</div>
            <p className="mt-2 font-semibold text-ink-900">{company}</p>
            {ownerP?.full_name && <p className="text-sm text-ink-500">Posted by {ownerP.full_name}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="Industry" value={client?.industry || "Not shared"} />
              <Info label="City" value={ownerP?.city || "Not shared"} />
              <Info label="Member since" value={ownerP?.created_at ? formatDate(ownerP.created_at) : "—"} />
              <Info label="Company size" value={client?.company_size || "Not shared"} />
              <Info label="Jobs posted" value={String(jobsPosted ?? 0)} />
              <Info label="Designers hired" value={String(hires ?? 0)} />
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-800">{value}</dd>
    </div>
  );
}

function AppliedPanel({ app, justApplied }: { app: Application; justApplied: boolean }) {
  return (
    <Card className={justApplied ? "border-success-600/30 bg-success-50 p-6" : "p-6"}>
      {justApplied ? (
        <>
          <div className="flex items-center gap-2 text-success-600"><CheckCircle2 size={20} aria-hidden /><h2 className="font-display text-xl font-semibold">Application sent</h2></div>
          <p className="mt-2 text-ink-700">
            The client has been notified. We&apos;ll let you know when they shortlist you or reply. You proposed {formatINR(app.proposed_amount)}
            {app.timeline_days ? ` over ${app.timeline_days} days` : ""}.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink-900">You applied {timeAgo(app.created_at)}</h2>
            <ApplicationBadge status={app.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">You can only apply once per job. Track the status from your applications.</p>
        </>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton href={justApplied ? "/designer/applications" : `/designer/applications/${app.id}`}>{justApplied ? "View my applications" : "View application"}</LinkButton>
        <LinkButton href="/designer/jobs" variant="secondary">Keep browsing</LinkButton>
      </div>
    </Card>
  );
}
