import { requireClient } from "@/lib/client/data";
import { Card, PageHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ChipGroup } from "@/components/ui/chips";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSettings } from "@/app/client/settings/actions";
import { BUDGETS, CITIES, COMPANY_SIZES, INDUSTRIES, JOB_CATEGORIES } from "@/lib/options";

export const metadata = { title: "Company settings" };

export default async function SettingsPage() {
  const { viewer, company } = await requireClient();
  const opts = (list: string[]) => ["", ...list].map((c) => <option key={c} value={c}>{c || "Choose…"}</option>);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Company settings" sub="Designers see your company name and industry on your jobs. Your GSTIN goes on your invoices." />
      <ActionForm action={saveSettings} className="gap-6">
        <Card className="flex flex-col gap-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">You and your company</h2>
          <Field label="Your name"><Input name="full_name" defaultValue={viewer.full_name} required maxLength={80} /></Field>
          <Field label="Company or brand name"><Input name="company_name" defaultValue={company.company_name} required maxLength={120} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Industry"><Select name="industry" defaultValue={company.industry ?? ""}>{opts(INDUSTRIES)}</Select></Field>
            <Field label="Team size"><Select name="company_size" defaultValue={company.company_size ?? ""}>{opts(COMPANY_SIZES)}</Select></Field>
            <Field label="City"><Select name="city" defaultValue={viewer.city ?? ""}>{opts(CITIES)}</Select></Field>
            <Field label="Website"><Input name="website" defaultValue={company.website ?? ""} placeholder="yourbrand.in" /></Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">Tax details</h2>
          <Field label="GSTIN" hint="15 characters. With a GSTIN on file you can claim input tax credit on the platform fee. The first two digits set your state for CGST/SGST or IGST.">
            <Input name="gstin" defaultValue={company.gstin ?? ""} maxLength={15} placeholder="27ABCDE1234F1Z5" className="font-mono uppercase" />
          </Field>
        </Card>

        <Card className="flex flex-col gap-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">What you hire for</h2>
          <Field label="Kinds of design work"><ChipGroup name="needs" options={JOB_CATEGORIES} selected={company.needs ?? []} /></Field>
          <Field label="Typical project budget"><ChipGroup name="typical_budget" type="radio" options={BUDGETS} selected={company.typical_budget ? [company.typical_budget] : []} /></Field>
        </Card>

        <SubmitButton className="self-end" size="lg" pending="Saving…">Save changes</SubmitButton>
      </ActionForm>
    </div>
  );
}
