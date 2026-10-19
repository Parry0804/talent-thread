import { Sparkles, PenLine } from "lucide-react";
import { requireClient } from "@/lib/client/data";
import { Card, PageHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { startBlankJob, writeBriefWithAI } from "@/app/client/jobs/new/actions";

export const metadata = { title: "Post a job" };
export const maxDuration = 120;

const EXAMPLES = [
  "We're a Pune-based D2C chai brand launching a new masala range. Need packaging for 3 SKUs (250g pouches) that feels premium but still desi. Launch is in 6 weeks.",
  "Our fintech app's onboarding has too many drop-offs. Want someone to redesign the 5 sign-up screens in Figma, with Hindi support. Budget is flexible for the right person.",
];

export default async function NewJobPage() {
  const { company } = await requireClient();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Post a job · Step 1 of 3" title="What do you need designed?" sub="Write it the way you'd explain it to a friend. Our AI turns it into a clear brief you can edit before anything goes live." />

      <Card className="p-6 sm:p-8">
        <ActionForm action={writeBriefWithAI}>
          <label className="flex flex-col gap-2">
            <span className="font-medium text-ink-900">Describe what you need in your own words</span>
            <Textarea
              name="description"
              required
              minLength={30}
              maxLength={6000}
              rows={9}
              className="min-h-56 text-[15px] leading-relaxed"
              placeholder={`For example: ${EXAMPLES[0]}`}
            />
            <span className="text-xs text-ink-500">
              Mention what it&apos;s for, who your customers are, any deadline and a rough budget if you have one.
              {company.company_name ? ` We'll add that it's for ${company.company_name}.` : ""}
            </span>
          </label>

          <div className="rounded-md bg-paper-50 p-4 text-sm text-ink-600">
            <p className="mb-2 font-medium text-ink-800">Not sure what to write? Here&apos;s what others say:</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              {EXAMPLES.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-500">Takes about 20–40 seconds. Nothing is published until you say so.</p>
            <SubmitButton variant="brand" size="lg" pending={<><Sparkles size={18} className="animate-pulse" /> Writing your brief…</>}>
              <Sparkles size={18} /> Write my brief
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <form action={startBlankJob} className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-500">
        <span>Already have a brief?</span>
        <SubmitButton variant="ghost" size="sm" pending="Creating draft…"><PenLine size={14} /> Skip AI, write it myself</SubmitButton>
      </form>
    </div>
  );
}
