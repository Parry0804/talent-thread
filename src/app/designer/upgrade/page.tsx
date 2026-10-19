import { BadgeCheck, Check, Search, Sparkles } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FREE_REVIEWS_PER_MONTH } from "@/lib/ai/rubric";
import { daysAgoISO } from "@/lib/designer-ai/time";
import { ActionForm } from "@/components/ui/action-form";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPro } from "@/app/designer/upgrade/actions";

export const metadata = { title: "Upgrade to Pro" };

const PERKS = [
  { icon: <Sparkles size={18} />, title: "Unlimited AI reviews", body: `Free gives you ${FREE_REVIEWS_PER_MONTH} a month. Pro lets you re-check your portfolio every time you improve it.` },
  { icon: <Search size={18} />, title: "Priority in client search", body: "Your profile appears higher when clients search for designers in your discipline." },
  { icon: <BadgeCheck size={18} />, title: "Pro badge on your profile", body: "A small mark that tells clients you take your practice seriously." },
];

export default async function UpgradePage() {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const { data: dp } = await supabase.from("designer_profiles").select("plan").eq("id", viewer.id).single();
  const isPro = dp?.plan === "pro";
  const since = daysAgoISO(30);
  const { count: interested } = await createServiceClient()
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", viewer.id)
    .eq("action", "pro_interest")
    .gte("created_at", since);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Plans" title="Talent Thread Pro" sub="For designers who want to improve fast and get found first." />

      <div className="grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card className="p-6 sm:p-8">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tabular">₹499</span>
            <span className="text-ink-500">/month</span>
          </div>
          <p className="mt-1 text-sm text-ink-500">Monthly plan, once checkout opens.</p>
          <ul className="mt-6 flex flex-col gap-5">
            {PERKS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marigold-50 text-marigold-800">{p.icon}</span>
                <div>
                  <div className="font-semibold text-ink-900">{p.title}</div>
                  <p className="text-sm text-ink-600">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-md border border-marigold-300 bg-marigold-50 p-4 text-sm text-ink-800">
            <strong className="font-semibold">Pro checkout is coming soon.</strong> We&apos;re not taking payments for Pro yet. Tell us you&apos;re interested and we&apos;ll message you the day it opens. Nothing will be charged now.
          </div>

          {isPro ? (
            <p className="mt-6"><Badge tone="highlight">You&apos;re on Pro</Badge></p>
          ) : (
            <ActionForm action={requestPro} className="mt-6">
              {interested ? (
                <p className="text-sm text-success-600">You&apos;re on the list. We&apos;ll let you know when Pro checkout opens.</p>
              ) : (
                <SubmitButton size="lg" pending="Saving…" className="self-start">Tell me when Pro is available</SubmitButton>
              )}
            </ActionForm>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-ink-900">Free vs Pro</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-500">
                <th className="pb-2 font-medium" />
                <th className="pb-2 font-medium">Free</th>
                <th className="pb-2 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              <tr><td className="py-2.5 text-ink-700">AI reviews</td><td className="tabular">{FREE_REVIEWS_PER_MONTH}/month</td><td className="font-medium">Unlimited</td></tr>
              <tr><td className="py-2.5 text-ink-700">Skill roadmap</td><td><Check size={16} className="text-success-600" aria-label="Included" /></td><td><Check size={16} className="text-success-600" aria-label="Included" /></td></tr>
              <tr><td className="py-2.5 text-ink-700">Apply to jobs</td><td><Check size={16} className="text-success-600" aria-label="Included" /></td><td><Check size={16} className="text-success-600" aria-label="Included" /></td></tr>
              <tr><td className="py-2.5 text-ink-700">Search priority</td><td className="text-ink-400">Standard</td><td className="font-medium">Priority</td></tr>
              <tr><td className="py-2.5 text-ink-700">Pro badge</td><td className="text-ink-400">–</td><td><Check size={16} className="text-success-600" aria-label="Included" /></td></tr>
              <tr><td className="py-2.5 text-ink-700">Commission</td><td>10%</td><td>10%</td></tr>
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ink-500">Commission drops to 5% on repeat hires with the same client, on both plans.</p>
        </Card>
      </div>
    </div>
  );
}
