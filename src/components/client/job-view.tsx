import { CalendarClock, GraduationCap, MapPin, Paperclip, Sparkles, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBudget } from "@/lib/money";
import { fileLabel } from "@/lib/client/files";
import type { Job } from "@/lib/types";

/** The job as designers will see it. `files` are signed links to the attachments. */
export function JobView({ job, company, files }: { job: Job; company: string; files: { path: string; url: string | null }[] }) {
  const brief = (job.brief ?? {}) as { questions_for_designers?: string[] };
  const questions = Array.isArray(brief.questions_for_designers) ? brief.questions_for_designers : [];
  const facts = [
    { icon: <Wallet size={16} />, label: job.budget_type === "hourly" ? "Hourly rate" : "Fixed budget", value: formatBudget(job.budget_min, job.budget_max, job.budget_type) },
    { icon: <CalendarClock size={16} />, label: "Timeline", value: job.timeline_weeks ? `${job.timeline_weeks} week${job.timeline_weeks === 1 ? "" : "s"}` : "Flexible" },
    { icon: <GraduationCap size={16} />, label: "Experience", value: job.experience_level ?? "Any level" },
    { icon: <MapPin size={16} />, label: "Location", value: job.location_pref ?? "No preference" },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-paper-200 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <Badge>{job.category}</Badge>
          <span>{company || "A Talent Thread client"}</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">{job.title}</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="flex items-center gap-1.5 text-xs text-ink-500">{f.icon}{f.label}</dt>
              <dd className="mt-1 text-sm font-medium tabular">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <section>
          <h3 className="text-sm font-semibold text-ink-900">About the project</h3>
          <div className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{job.description || "No description yet."}</div>
        </section>
        {job.deliverables.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink-900">Deliverables</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-700">{job.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
          </section>
        )}
        {job.skills.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink-900">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-2">{job.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </section>
        )}
        {questions.length > 0 && (
          <section className="rounded-md bg-violet-50/60 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-violet-700"><Sparkles size={14} /> Please answer in your proposal</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-700">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
        )}
        {files.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink-900">Reference files</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {files.map((f) => (
                <li key={f.path} className="flex items-center gap-2 text-sm">
                  <Paperclip size={14} className="text-ink-400" />
                  {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-ink-800 underline-offset-2 hover:underline">{fileLabel(f.path)}</a> : fileLabel(f.path)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}
