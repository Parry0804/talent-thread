import { redirect } from "next/navigation";
import { requireRole, homeFor } from "@/lib/auth";
import { Logo } from "@/components/shell/logo";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ChipGroup } from "@/components/ui/chips";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/ui/action-form";
import { saveClientOnboarding, saveDesignerOnboarding } from "@/app/onboarding/actions";
import { BUDGETS, CITIES, COMPANY_SIZES, DISCIPLINES, EXPERIENCE, INDUSTRIES, JOB_CATEGORIES, LANGUAGES, SKILLS, TOOLS } from "@/lib/options";

export const metadata = { title: "Set up your profile" };

function Section({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">Step {n}</p>
      <h2 className="mt-1 font-display text-xl font-semibold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </Card>
  );
}

export default async function OnboardingPage() {
  const viewer = await requireRole("designer", "client", "admin");
  if (viewer.role === "admin" || viewer.onboarded) redirect(homeFor(viewer.role));
  const first = viewer.full_name.split(" ")[0] || "there";

  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center border-b border-paper-200 px-6"><Logo /></header>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl font-semibold">Welcome, {first}</h1>
        <p className="mt-2 text-ink-500">
          {viewer.role === "designer"
            ? "Tell us about your work. This takes about two minutes, and it decides which jobs we show you."
            : "Tell us about your business so designers know who they're working with."}
        </p>

        {viewer.role === "designer" ? (
          <ActionForm action={saveDesignerOnboarding} className="mt-8 gap-6">
            <Section n={1} title="Basic info">
              <Field label="Full name"><Input name="full_name" defaultValue={viewer.full_name} required /></Field>
              <Field label="One-line headline" hint="For example: Brand and UI designer for D2C startups">
                <Input name="headline" maxLength={90} required />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City"><Select name="city" defaultValue="">{["", ...CITIES].map((c) => <option key={c} value={c}>{c || "Choose…"}</option>)}</Select></Field>
                <Field label="Experience"><Select name="years_experience" defaultValue="2">{EXPERIENCE.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}</Select></Field>
              </div>
              <Field label="Languages you work in"><ChipGroup name="languages" options={LANGUAGES} selected={["English"]} /></Field>
            </Section>
            <Section n={2} title="Skills and tools" sub="Pick what you'd be happy to be hired for.">
              <Field label="Disciplines"><ChipGroup name="disciplines" options={DISCIPLINES} /></Field>
              <Field label="Skills"><ChipGroup name="skills" options={SKILLS} /></Field>
              <Field label="Tools"><ChipGroup name="tools" options={TOOLS} selected={["Figma"]} /></Field>
            </Section>
            <Section n={3} title="Rate and availability" sub="You can change these any time.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Hourly rate (₹)" hint="Optional. Your AI review will suggest a range."><Input name="hourly_rate" type="number" min={0} step={50} placeholder="1200" /></Field>
                <Field label="Availability">
                  <Select name="availability" defaultValue="available">
                    <option value="available">Available for new projects</option>
                    <option value="limited">Limited availability</option>
                    <option value="unavailable">Not taking work</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Behance"><Input name="behance" placeholder="behance.net/…" /></Field>
                <Field label="Dribbble"><Input name="dribbble" placeholder="dribbble.com/…" /></Field>
                <Field label="Website"><Input name="website" placeholder="yoursite.in" /></Field>
              </div>
            </Section>
            <SubmitButton size="lg" pending="Saving…" className="self-end">Finish and go to dashboard</SubmitButton>
          </ActionForm>
        ) : (
          <ActionForm action={saveClientOnboarding} className="mt-8 gap-6">
            <Section n={1} title="Your company">
              <Field label="Your name"><Input name="full_name" defaultValue={viewer.full_name} required /></Field>
              <Field label="Company or brand name"><Input name="company_name" required /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Industry"><Select name="industry" defaultValue="">{["", ...INDUSTRIES].map((c) => <option key={c} value={c}>{c || "Choose…"}</option>)}</Select></Field>
                <Field label="Team size"><Select name="company_size" defaultValue="">{["", ...COMPANY_SIZES].map((c) => <option key={c} value={c}>{c || "Choose…"}</option>)}</Select></Field>
                <Field label="City"><Select name="city" defaultValue="">{["", ...CITIES].map((c) => <option key={c} value={c}>{c || "Choose…"}</option>)}</Select></Field>
                <Field label="Website"><Input name="website" placeholder="yourbrand.in" /></Field>
              </div>
              <Field label="GSTIN" hint="Optional. Add it to get GST invoices you can claim input credit on.">
                <Input name="gstin" maxLength={15} placeholder="27ABCDE1234F1Z5" />
              </Field>
            </Section>
            <Section n={2} title="What you need">
              <Field label="Kinds of design work"><ChipGroup name="needs" options={JOB_CATEGORIES} /></Field>
              <Field label="Typical project budget"><ChipGroup name="typical_budget" type="radio" options={BUDGETS} /></Field>
            </Section>
            <SubmitButton size="lg" pending="Saving…" className="self-end">Finish and post a job</SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
