import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getOwnedJob, requireClient } from "@/lib/client/data";
import { Card, PageHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ChipGroup } from "@/components/ui/chips";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { JobBadge } from "@/components/ui/badge";
import { AttachmentsField } from "@/components/client/attachments-field";
import { saveJob } from "@/app/client/jobs/[id]/edit/actions";
import { JOB_CATEGORIES, SKILLS } from "@/lib/options";
import { EXPERIENCE_LEVELS, LOCATION_PREFS } from "@/lib/client/options";

export const metadata = { title: "Edit job" };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </Card>
  );
}

export default async function EditJobPage({ params, searchParams }: PageProps<"/client/jobs/[id]/edit">) {
  const { viewer } = await requireClient();
  const { id } = await params;
  const sp = await searchParams;
  const job = await getOwnedJob(id, viewer.id);
  const brief = (job.brief ?? {}) as { skills?: string[]; questions_for_designers?: string[] };
  const questions = Array.isArray(brief.questions_for_designers) ? brief.questions_for_designers : [];
  const skillOptions = [...new Set([...SKILLS, ...(brief.skills ?? []), ...job.skills])];
  const locations = job.location_pref && !LOCATION_PREFS.includes(job.location_pref) ? [...LOCATION_PREFS, job.location_pref] : LOCATION_PREFS;
  const drafted = sp.drafted === "1";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={job.status === "draft" ? "Post a job · Step 2 of 3" : "Edit job"}
        title={job.title === "Untitled job" ? "Write your brief" : "Review your brief"}
        sub={drafted ? "Here's the AI's first draft. Change anything that isn't right — you know your project best." : "Fill in each section. Clear briefs get better proposals."}
        action={<JobBadge status={job.status} />}
      />

      {drafted && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
          <Sparkles size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Drafted by AI from your description</p>
            <p className="mt-0.5 text-violet-700/80">Check the budget and timeline in particular. They&apos;re estimates based on typical Indian freelance rates in 2026.</p>
          </div>
        </div>
      )}

      <ActionForm action={saveJob} className="gap-6">
        <input type="hidden" name="id" value={job.id} />

        <Section title="The basics">
          <Field label="Job title" hint="Say what you need, e.g. “Brand identity for a Kochi seafood restaurant”">
            <Input name="title" defaultValue={job.title === "Untitled job" ? "" : job.title} maxLength={120} required />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={job.category}>
              {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Description" hint="What the project is, who it's for, and what a great result looks like.">
            <Textarea name="description" defaultValue={job.description} rows={10} required />
          </Field>
          <Field label="Deliverables" hint="One per line, e.g. “Logo in SVG and PNG”.">
            <Textarea name="deliverables" defaultValue={job.deliverables.join("\n")} rows={5} />
          </Field>
        </Section>

        <Section title="Skills" sub="Designers with these skills see your job first.">
          <ChipGroup name="skills" options={skillOptions} selected={job.skills} />
          <Field label="Other skills" hint="Comma separated. Optional.">
            <Input name="extra_skills" placeholder="Lottie animation, Tamil lettering" />
          </Field>
        </Section>

        <Section title="Budget and timeline">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Budget type">
              <Select name="budget_type" defaultValue={job.budget_type}>
                <option value="fixed">Fixed price</option>
                <option value="hourly">Hourly rate</option>
              </Select>
            </Field>
            <Field label="Minimum (₹)"><Input name="budget_min" type="number" min={0} step={500} defaultValue={job.budget_min || ""} placeholder="25000" /></Field>
            <Field label="Maximum (₹)"><Input name="budget_max" type="number" min={0} step={500} defaultValue={job.budget_max || ""} placeholder="40000" /></Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Timeline (weeks)"><Input name="timeline_weeks" type="number" min={1} max={104} defaultValue={job.timeline_weeks ?? ""} placeholder="4" /></Field>
            <Field label="Experience level">
              <Select name="experience_level" defaultValue={job.experience_level ?? ""}>
                <option value="">Any level</option>
                {EXPERIENCE_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
              </Select>
            </Field>
            <Field label="Location">
              <Select name="location_pref" defaultValue={job.location_pref ?? ""}>
                <option value="">No preference</option>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <p className="text-xs text-ink-500">You&apos;ll pay a 3% platform fee plus 18% GST on that fee when you fund each milestone. The designer&apos;s amount isn&apos;t affected.</p>
        </Section>

        <Section title="Reference files" sub="Optional. Brand guidelines, rough sketches or examples you like.">
          <AttachmentsField userId={viewer.id} initial={job.attachment_paths} />
        </Section>

        {questions.length > 0 && (
          <Card className="border-violet-200 bg-violet-50/40 p-6">
            <h2 className="flex items-center gap-2 font-semibold text-violet-700"><Sparkles size={16} /> Questions designers will be asked to answer</h2>
            <p className="mt-1 text-sm text-ink-500">The AI spotted gaps in your description. These appear on the job so designers address them in their proposals.</p>
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-700">
              {questions.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/client/jobs" className="text-sm text-ink-500 hover:text-ink-900">Back to my jobs</Link>
          <div className="flex gap-3">
            <SubmitButton variant="secondary" name="intent" value="save" pending="Saving…">Save draft</SubmitButton>
            <SubmitButton name="intent" value="preview" pending="Saving…">Save and preview</SubmitButton>
          </div>
        </div>
      </ActionForm>
    </div>
  );
}
