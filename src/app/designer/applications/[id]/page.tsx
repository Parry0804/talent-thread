import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Circle, X } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withdrawApplication } from "@/app/designer/applications/actions";
import { publicUrl } from "@/lib/storage";
import { designerPayout, formatBudget, formatINR } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/format";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { ApplicationBadge, ContractBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Application, Contract, Job, PortfolioItem } from "@/lib/types";

export const metadata = { title: "Application" };

type Step = { label: string; detail?: string; state: "done" | "current" | "todo" | "stopped" };

function timeline(a: Application): Step[] {
  const submitted: Step = { label: "Application sent", detail: formatDate(a.created_at), state: "done" };
  switch (a.status) {
    case "submitted":
      return [submitted, { label: "Client reviewing", detail: "Most clients reply within a few days", state: "current" }, { label: "Shortlist", state: "todo" }, { label: "Hired", state: "todo" }];
    case "shortlisted":
      return [submitted, { label: "Client reviewed", state: "done" }, { label: "Shortlisted", detail: "The client may message you or send an offer", state: "current" }, { label: "Hired", state: "todo" }];
    case "hired":
      return [submitted, { label: "Client reviewed", state: "done" }, { label: "Shortlisted", state: "done" }, { label: "Hired", detail: "An offer or contract was created", state: "done" }];
    case "rejected":
      return [submitted, { label: "Client reviewed", state: "done" }, { label: "Not selected this time", detail: "Keep going. Every brief is different.", state: "stopped" }];
    case "withdrawn":
      return [submitted, { label: "You withdrew this application", state: "stopped" }];
  }
}

export default async function ApplicationDetailPage({ params }: PageProps<"/designer/applications/[id]">) {
  const viewer = await requireOnboarded("designer");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: row } = await supabase.from("applications").select("*").eq("id", id).eq("designer_id", viewer.id).maybeSingle();
  const app = row as Application | null;
  if (!app) notFound();

  const [{ data: jobRow }, { data: contractRow }, { data: itemRows }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", app.job_id).maybeSingle(),
    supabase.from("contracts").select("*").eq("application_id", app.id).eq("designer_id", viewer.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    app.portfolio_item_ids.length ? supabase.from("portfolio_items").select("*").in("id", app.portfolio_item_ids) : Promise.resolve({ data: [] }),
  ]);
  const job = jobRow as Job | null;
  const contract = contractRow as Contract | null;
  const items = (itemRows ?? []) as PortfolioItem[];
  const { data: cp } = job ? await supabase.from("client_profiles").select("company_name").eq("id", job.client_id).maybeSingle() : { data: null };
  const company = cp?.company_name || "A Talent Thread client";
  const payout = designerPayout(app.proposed_amount, contract?.repeat_hire ?? false);
  const canWithdraw = app.status === "submitted" || app.status === "shortlisted";

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/designer/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={15} aria-hidden /> All applications
      </Link>
      <PageHeader
        title={job?.title ?? "Job removed"}
        sub={`${company} · applied ${timeAgo(app.created_at)}`}
        action={<ApplicationBadge status={app.status} />}
      />

      {contract && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-success-600/30 bg-success-50 p-5">
          <div>
            <p className="font-semibold text-ink-900">You were hired for this job</p>
            <p className="text-sm text-ink-600"><span className="font-mono">{contract.code}</span> · {formatINR(contract.total_amount)} · <ContractBadge status={contract.status} /></p>
          </div>
          <LinkButton href={`/contracts/${contract.id}`}>Open contract</LinkButton>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {job && (
            <Card>
              <CardHeader title="The job" action={<Link href={`/designer/jobs/${job.id}`} className="text-sm text-ink-500 hover:text-ink-900">View brief</Link>} />
              <CardBody className="flex flex-col gap-2 text-sm text-ink-700">
                <p className="line-clamp-4 whitespace-pre-line">{job.description}</p>
                <p className="text-ink-500">
                  Budget {formatBudget(job.budget_min, job.budget_max, job.budget_type)}
                  {job.timeline_weeks ? ` · ${job.timeline_weeks} weeks` : ""} · {job.category}
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="What you sent" />
            <CardBody className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-ink-500">Your price</p><p className="font-display text-xl font-semibold tabular">{formatINR(app.proposed_amount)}</p></div>
                <div><p className="text-xs text-ink-500">You&apos;d receive</p><p className="font-display text-xl font-semibold tabular">{formatINR(payout.net)}</p><p className="text-xs text-ink-500">after commission and 0.1% TDS</p></div>
                <div><p className="text-xs text-ink-500">Timeline</p><p className="font-display text-xl font-semibold">{app.timeline_days ? `${app.timeline_days} days` : "—"}</p></div>
              </div>
              <div>
                <p className="mb-1 text-xs text-ink-500">Cover letter</p>
                <p className="whitespace-pre-line text-ink-800">{app.cover_letter}</p>
              </div>
              {items.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-ink-500">Portfolio pieces attached</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {items.map((it) => {
                      const src = publicUrl("portfolio", it.image_paths[0]);
                      return (
                        <div key={it.id} className="overflow-hidden rounded-md border border-paper-200">
                          <div className="aspect-[4/3] bg-paper-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {src && <img src={src} alt={it.title} className="h-full w-full object-cover" />}
                          </div>
                          <p className="truncate px-3 py-2 text-sm font-medium">{it.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="font-semibold text-ink-900">Status</h2>
            <ol className="mt-4 flex flex-col gap-4">
              {timeline(app).map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                      s.state === "done" && "bg-ink-900 text-paper-50",
                      s.state === "current" && "bg-marigold-500 text-ink-900",
                      s.state === "todo" && "border border-paper-300 text-paper-300",
                      s.state === "stopped" && "bg-paper-200 text-ink-600",
                    )}
                  >
                    {s.state === "done" ? <Check size={12} /> : s.state === "stopped" ? <X size={12} /> : <Circle size={6} fill="currentColor" />}
                  </span>
                  <div>
                    <p className={cn("text-sm font-medium", s.state === "todo" ? "text-ink-400" : "text-ink-900")}>{s.label}</p>
                    {s.detail && <p className="text-xs text-ink-500">{s.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {app.fit_score != null && (
              <p className="mt-5 border-t border-paper-200 pt-4 text-sm text-violet-600">
                {app.fit_score}% fit when you applied{app.fit_reasons[0] ? ` · ${app.fit_reasons[0]}` : ""}
              </p>
            )}
          </Card>

          {canWithdraw && (
            <Card className="p-5">
              <h2 className="font-semibold text-ink-900">Withdraw application</h2>
              <p className="mt-1 text-sm text-ink-500">The client will no longer see this proposal. You can&apos;t re-apply to the same job afterwards.</p>
              <ActionForm action={withdrawApplication} className="mt-4 gap-3">
                <input type="hidden" name="application_id" value={app.id} />
                <SubmitButton variant="danger" pending="Withdrawing…">Withdraw application</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
