import { Check, Sparkles } from "lucide-react";
import { requireClient } from "@/lib/client/data";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerGrowthInterest } from "@/app/client/plan/actions";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Plans" };

const STARTER = [
  "Post jobs and get proposals",
  "AI brief builder",
  "Applicants ranked by fit",
  "Milestone escrow with GST invoices",
  "3% platform fee + GST per milestone",
];
const GROWTH = [
  "14-day free trial",
  "AI talent picks for every job",
  "Unlimited job posts",
  "Priority support",
  "Everything in Starter",
];

export default async function PlanPage() {
  const { viewer, company } = await requireClient();
  const growth = company.plan === "growth";
  const { count } = await createServiceClient()
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", viewer.id)
    .eq("action", "plan.growth_interest");
  const onList = Boolean(count);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Plans" sub="Starter is free to use: you only pay the platform fee when you fund a milestone. Growth adds AI talent picks." />

      {!growth && (
        <div className="mb-6 rounded-lg border border-marigold-300 bg-marigold-50 p-4 text-sm text-ink-800">
          <span className="font-semibold">Growth billing is coming soon.</span> We haven&apos;t switched on subscriptions yet, so you can&apos;t upgrade today. Join the list
          and we&apos;ll tell you the moment it opens. Nothing will be charged until you choose to start.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Starter</h2>
            {!growth && <Badge tone="success">Your plan</Badge>}
          </div>
          <div className="mt-3 font-display text-4xl font-semibold">₹0<span className="text-base font-normal text-ink-500">/month</span></div>
          <ul className="mt-6 flex flex-col gap-2.5 text-sm">
            {STARTER.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success-600" />{f}</li>)}
          </ul>
        </Card>

        <Card className="flex flex-col border-violet-200 p-6 ring-1 ring-violet-200 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Sparkles size={18} className="text-violet-600" /> Growth</h2>
            {growth ? <Badge tone="success">Your plan</Badge> : <Badge tone="brand">Coming soon</Badge>}
          </div>
          <div className="mt-3 font-display text-4xl font-semibold">₹2,999<span className="text-base font-normal text-ink-500">/month</span></div>
          <p className="text-xs text-ink-500">Plus 18% GST. 14-day free trial.</p>
          <ul className="mt-6 flex flex-col gap-2.5 text-sm">
            {GROWTH.map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-violet-600" />{f}</li>)}
          </ul>
          <div className="mt-auto pt-8">
            {growth ? (
              <p className="text-sm text-ink-600">
                You&apos;re on Growth{company.trial_ends_at ? ` · trial ends ${formatDate(company.trial_ends_at)}` : ""}. To change your plan, contact Talent Thread support.
              </p>
            ) : onList ? (
              <p className="rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-700">You&apos;re on the list. We&apos;ll notify you when Growth billing opens.</p>
            ) : (
              <ActionForm action={registerGrowthInterest} className="gap-3">
                <SubmitButton className="w-full" pending="Saving…">Tell me when Growth opens</SubmitButton>
                <p className="text-center text-xs text-ink-500">We&apos;ll only send you an in-app notification. No payment details needed.</p>
              </ActionForm>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
