import { Eye, Pencil } from "lucide-react";
import { getOwnedJob, requireClient } from "@/lib/client/data";
import { jobProblems } from "@/lib/client/job-checks";
import { PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { JobBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { JobView } from "@/components/client/job-view";
import { publishJob } from "@/app/client/jobs/[id]/preview/actions";

export const metadata = { title: "Preview job" };

export default async function PreviewJobPage({ params }: PageProps<"/client/jobs/[id]/preview">) {
  const { viewer, company, supabase } = await requireClient();
  const { id } = await params;
  const job = await getOwnedJob(id, viewer.id);

  let files: { path: string; url: string | null }[] = [];
  if (job.attachment_paths.length) {
    const { data } = await supabase.storage.from("job-files").createSignedUrls(job.attachment_paths, 3600);
    files = job.attachment_paths.map((p) => ({ path: p, url: data?.find((d) => d.path === p)?.signedUrl ?? null }));
  }
  const problems = jobProblems(job);
  const isDraft = job.status === "draft" || job.status === "closed";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={job.status === "draft" ? "Post a job · Step 3 of 3" : "Job preview"}
        title="This is what designers will see"
        sub={isDraft ? "Check it reads well. Once you publish, matching designers can find it and apply." : "Your job is live. Edits show up for designers straight away."}
        action={<JobBadge status={job.status} />}
      />
      <div className="mb-4 flex items-center gap-2 text-sm text-ink-500"><Eye size={16} /> Designer view</div>
      <JobView job={job} company={company.company_name} files={files} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <LinkButton href={`/client/jobs/${job.id}/edit`} variant="secondary"><Pencil size={16} /> Edit brief</LinkButton>
        {job.status === "open" ? (
          <div className="flex gap-3">
            <LinkButton href={`/client/jobs/${job.id}/published`} variant="secondary">Invite designers</LinkButton>
            <LinkButton href={`/client/jobs/${job.id}/applicants`}>See applicants</LinkButton>
          </div>
        ) : job.status === "filled" ? null : (
          <ActionForm action={publishJob} className="items-end gap-2">
            <input type="hidden" name="id" value={job.id} />
            {problems.length > 0 && <p className="text-right text-sm text-ink-500">Before publishing: {problems.join(" ")}</p>}
            <SubmitButton size="lg" pending="Publishing…">{job.status === "closed" ? "Reopen and publish" : "Publish job"}</SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
