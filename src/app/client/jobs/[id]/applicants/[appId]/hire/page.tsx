import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getOwnedJob, loadDesigners, requireClient } from "@/lib/client/data";
import { Card, PageHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { MilestoneEditor, type MilestoneRow } from "@/components/client/milestone-editor";
import { sendOffer } from "@/app/client/jobs/[id]/applicants/[appId]/hire/actions";
import { formatINR, AUTO_APPROVE_DAYS, MAX_REVISIONS } from "@/lib/money";
import type { Application } from "@/lib/types";

export const metadata = { title: "Send an offer" };

function addDays(days: number) {
  const d = new Date(Date.now() + days * 86400_000);
  return d.toISOString().slice(0, 10);
}

export default async function HirePage({ params }: PageProps<"/client/jobs/[id]/applicants/[appId]/hire">) {
  const { viewer, supabase } = await requireClient();
  const { id, appId } = await params;
  const job = await getOwnedJob(id, viewer.id);
  const { data } = await supabase.from("applications").select("*").eq("id", appId).eq("job_id", job.id).maybeSingle();
  if (!data) notFound();
  const app = data as Application;
  if (app.status === "hired") {
    const { data: c } = await supabase.from("contracts").select("id").eq("application_id", app.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (c) redirect(`/contracts/${c.id}`);
  }
  if (!["submitted", "shortlisted"].includes(app.status)) redirect(`/client/jobs/${job.id}/applicants/${app.id}`);

  const designer = (await loadDesigners([app.designer_id])).get(app.designer_id);
  const name = designer?.name ?? "the designer";
  const first = name.split(" ")[0];
  const half = Math.floor(app.proposed_amount / 2);
  const days = app.timeline_days ?? (job.timeline_weeks ? job.timeline_weeks * 7 : 28);
  const initial: MilestoneRow[] = [
    { title: "First draft and concepts", description: "", amount: half, due_date: addDays(Math.max(3, Math.round(days / 2))) },
    { title: "Final files and handover", description: job.deliverables.join("\n"), amount: app.proposed_amount - half, due_date: addDays(Math.max(7, days)) },
  ];
  const scope = [job.description.split("\n\n")[0], job.deliverables.length ? `Deliverables:\n${job.deliverables.map((d) => `- ${d}`).join("\n")}` : ""].filter(Boolean).join("\n\n");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/client/jobs/${job.id}/applicants/${app.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> Back to {first}&apos;s proposal</Link>
      <PageHeader title={`Hire ${name}`} sub="Set out what you're paying for and when. The designer reviews and accepts the offer before any money moves." />

      <Card className="mb-6 flex items-center gap-4 p-5">
        <Avatar name={name} src={designer?.avatar} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{name}</div>
          <div className="truncate text-sm text-ink-500">{designer?.profile.headline}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-ink-500">Proposed</div>
          <div className="font-display text-lg font-semibold tabular">{formatINR(app.proposed_amount)}</div>
        </div>
      </Card>

      <ActionForm action={sendOffer} className="gap-6">
        <input type="hidden" name="job_id" value={job.id} />
        <input type="hidden" name="app_id" value={app.id} />
        <Card className="flex flex-col gap-5 p-6 sm:p-8">
          <Field label="Contract title"><Input name="title" defaultValue={job.title} maxLength={120} required /></Field>
          <Field label="Scope" hint="What's included, and anything that isn't. Both of you will see this on the contract.">
            <Textarea name="scope" defaultValue={scope} rows={7} required />
          </Field>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">Milestones</h2>
          <p className="mb-5 mt-1 text-sm text-ink-500">We&apos;ve split {first}&apos;s proposed {formatINR(app.proposed_amount)} into two equal milestones. Adjust as you like.</p>
          <MilestoneEditor initial={initial} />
        </Card>

        <div className="flex items-start gap-3 rounded-lg bg-success-50 p-4 text-sm text-success-600">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p>
            Each milestone is paid into escrow before work starts and released only when you approve. If you don&apos;t respond within {AUTO_APPROVE_DAYS} days of a
            submission, it&apos;s approved automatically. Each milestone includes up to {MAX_REVISIONS} rounds of changes.
          </p>
        </div>

        <div className="flex justify-end">
          <SubmitButton size="lg" pending="Sending offer…">Send offer to {first}</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
