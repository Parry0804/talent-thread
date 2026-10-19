import Link from "next/link";
import { Building2, Clock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FitPill } from "@/components/designer-work/fit-pill";
import { SkillChips } from "@/components/designer-work/skill-chips";
import { SaveJobButton } from "@/components/designer-work/save-job-button";
import { formatBudget } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import type { FitResult } from "@/lib/matching/fit";
import type { Job } from "@/lib/types";

export function JobCard({
  job,
  company,
  applicants,
  fit,
  saved,
  mySkills = [],
  applied,
  compact,
}: {
  job: Job;
  company: string;
  applicants: number;
  fit: FitResult;
  saved?: boolean;
  mySkills?: string[];
  applied?: boolean;
  compact?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5 transition-colors hover:border-ink-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/designer/jobs/${job.id}`} className="font-semibold text-ink-900 hover:underline">
            {job.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1"><Building2 size={14} aria-hidden />{company}</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden />{timeAgo(job.published_at ?? job.created_at)}</span>
            {!compact && (
              <span className="inline-flex items-center gap-1">
                <Users size={14} aria-hidden />
                {applicants === 0 ? "No applicants yet" : `${applicants} applicant${applicants === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-display text-lg font-semibold tabular text-ink-900">{formatBudget(job.budget_min, job.budget_max, job.budget_type)}</span>
          {saved !== undefined && <SaveJobButton jobId={job.id} saved={saved} />}
        </div>
      </div>
      {!compact && job.description && <p className="line-clamp-2 text-sm text-ink-600">{job.description}</p>}
      <SkillChips skills={job.skills} highlight={mySkills} max={compact ? 4 : 6} />
      <div className="flex flex-wrap items-center gap-2">
        <FitPill score={fit.score} reason={fit.reasons[0]} />
        <Badge>{job.category}</Badge>
        {job.experience_level && <Badge>{job.experience_level}</Badge>}
        {applied && <Badge tone="success">Applied</Badge>}
      </div>
    </Card>
  );
}
