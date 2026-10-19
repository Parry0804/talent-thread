import { redirect } from "next/navigation";
import { Check, PartyPopper, Send, Sparkles } from "lucide-react";
import { getOwnedJob, requireClient } from "@/lib/client/data";
import { rankDesignersForJob } from "@/lib/client/matching";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DesignerMiniCard } from "@/components/client/designer-mini-card";
import { quickInvite } from "@/app/client/jobs/[id]/published/actions";

export const metadata = { title: "Job published" };

export default async function PublishedPage({ params, searchParams }: PageProps<"/client/jobs/[id]/published">) {
  const { viewer, company, supabase } = await requireClient();
  const { id } = await params;
  const sp = await searchParams;
  const job = await getOwnedJob(id, viewer.id);
  if (job.status !== "open") redirect(`/client/jobs/${job.id}/preview`);

  const [{ data: inv }, { data: apps }] = await Promise.all([
    supabase.from("invites").select("designer_id").eq("job_id", job.id),
    supabase.from("applications").select("designer_id").eq("job_id", job.id),
  ]);
  const invited = new Set((inv ?? []).map((r) => r.designer_id as string));
  const applied = (apps ?? []).map((r) => r.designer_id as string);
  const matches = await rankDesignersForJob(job, 6, applied);
  const message = `Hi! I think your work fits our project “${job.title}”. Would you take a look and send a proposal?`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Job is live"
        title={<span className="inline-flex items-center gap-3">Published! Invite designers <PartyPopper size={26} className="text-marigold-500" /></span>}
        sub={`“${job.title}” is now visible to designers. Invited designers hear about it straight away and usually reply faster.`}
        action={<LinkButton href={`/client/jobs/${job.id}/applicants`}>Go to applicants</LinkButton>}
      />
      <FormError message={typeof sp.error === "string" ? sp.error : undefined} />

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-violet-600" />
          <h2 className="font-semibold">Top matches for this job</h2>
          <span className="text-sm text-ink-500">· ranked by skills, discipline, rate and availability</span>
        </div>
        {matches.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((d) => (
              <DesignerMiniCard
                key={d.id}
                d={d}
                action={
                  invited.has(d.id) ? (
                    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-50 px-3 text-sm font-medium text-success-600"><Check size={14} /> Invited</span>
                  ) : (
                    <form action={quickInvite}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="designer_id" value={d.id} />
                      <input type="hidden" name="message" value={message} />
                      <SubmitButton size="sm" pending="Inviting…"><Send size={14} /> Invite</SubmitButton>
                    </form>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matching designers yet"
            body="As designers join with the skills you picked, they'll show up here. Your job is still live, so designers can find it and apply."
            action={<LinkButton href="/client/designers" variant="secondary" size="sm">Browse all designers</LinkButton>}
          />
        )}
        <p className="mt-5 text-xs text-ink-500">Invites send {company.company_name ? `${company.company_name}'s` : "your"} job with a short note: “{message}”</p>
      </Card>
    </div>
  );
}
