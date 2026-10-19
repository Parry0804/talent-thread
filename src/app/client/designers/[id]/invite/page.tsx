import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { loadDesigners, requireClient, completedContractCounts } from "@/lib/client/data";
import { fitScore } from "@/lib/matching/fit";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { inviteDesigner } from "@/app/client/designers/[id]/invite/actions";
import type { Job } from "@/lib/types";

export const metadata = { title: "Invite to a job" };

export default async function InvitePage({ params, searchParams }: PageProps<"/client/designers/[id]/invite">) {
  const { viewer, supabase } = await requireClient();
  const { id } = await params;
  const sp = await searchParams;
  const designer = (await loadDesigners([id])).get(id);
  if (!designer) notFound();
  const first = designer.name.split(" ")[0];

  const [{ data: rows }, { data: inv }, { data: apps }, counts] = await Promise.all([
    supabase.from("jobs").select("*").eq("client_id", viewer.id).eq("status", "open").order("published_at", { ascending: false }),
    supabase.from("invites").select("job_id").eq("designer_id", id).eq("client_id", viewer.id),
    supabase.from("applications").select("job_id").eq("designer_id", id),
    completedContractCounts([id]),
  ]);
  const taken = new Set([...(inv ?? []), ...(apps ?? [])].map((r) => r.job_id as string));
  const jobs = ((rows ?? []) as Job[]).map((j) => ({ job: j, fit: fitScore(j, designer.profile, counts.get(id) ?? 0).score, taken: taken.has(j.id) }));
  const available = jobs.filter((j) => !j.taken).sort((a, b) => b.fit - a.fit);
  const preselect = typeof sp.job === "string" && available.some((j) => j.job.id === sp.job) ? sp.job : available[0]?.job.id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/client/designers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={14} /> Find designers</Link>
      <PageHeader title={`Invite ${first} to a job`} sub="They'll get a notification with your job and message, and can apply in one step." />

      <Card className="mb-6 flex items-center gap-4 p-5">
        <Avatar name={designer.name} src={designer.avatar} size={48} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{designer.name}</div>
          <div className="truncate text-sm text-ink-500">{designer.profile.headline || "Designer"}</div>
        </div>
        {designer.profile.slug && <LinkButton href={`/d/${designer.profile.slug}`} variant="ghost" size="sm">View profile</LinkButton>}
      </Card>

      {!jobs.length ? (
        <EmptyState title="You don't have any open jobs" body="Publish a job first, then invite designers to apply to it." action={<LinkButton href="/client/jobs/new" size="sm"><Sparkles size={14} /> Post a job with AI</LinkButton>} />
      ) : !available.length ? (
        <EmptyState title={`${first} already has all your open jobs`} body="You've invited them to, or they've applied to, every job you have open." action={<LinkButton href="/client/jobs" size="sm" variant="secondary">See my jobs</LinkButton>} />
      ) : (
        <Card className="p-6 sm:p-8">
          <ActionForm action={inviteDesigner}>
            <input type="hidden" name="designer_id" value={id} />
            <Field label="Which job?">
              <Select name="job_id" defaultValue={preselect} required>
                {available.map(({ job, fit }) => <option key={job.id} value={job.id}>{job.title} · {fit}% fit</option>)}
              </Select>
            </Field>
            <Field label="Short message" hint="Optional. Say why you thought of them — it makes a reply much more likely.">
              <Textarea name="message" rows={4} maxLength={1000} placeholder={`Hi ${first}, loved your packaging work. Would you take a look at our brief?`} />
            </Field>
            {jobs.some((j) => j.taken) && <p className="text-xs text-ink-500">Jobs you&apos;ve already invited {first} to, or that they&apos;ve applied for, aren&apos;t listed.</p>}
            <SubmitButton className="self-end" pending="Sending…">Send invite</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
