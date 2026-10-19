import { CheckCircle2, Circle, ExternalLink, ShieldCheck } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CITIES, DISCIPLINES, LANGUAGES, SKILLS, TOOLS } from "@/lib/options";
import { LINK_FIELDS, profileCompleteness } from "@/lib/designer-ai/profile";
import { ActionForm } from "@/components/ui/action-form";
import { Card, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ChipGroup } from "@/components/ui/chips";
import { SubmitButton } from "@/components/ui/submit-button";
import { AvatarField } from "@/components/designer-ai/avatar-field";
import { saveProfile } from "@/app/designer/profile/actions";
import type { DesignerProfile } from "@/lib/types";

export const metadata = { title: "Profile" };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </Card>
  );
}

export default async function ProfilePage() {
  const viewer = await requireOnboarded("designer");
  const supabase = await createClient();
  const [{ data }, { count: pieces }, { data: payout }] = await Promise.all([
    supabase.from("designer_profiles").select("*").eq("id", viewer.id).single(),
    supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("designer_id", viewer.id),
    supabase.from("designer_payout").select("payout_upi, pan_last4").eq("id", viewer.id).maybeSingle(),
  ]);
  const d = data as DesignerProfile;
  const { pct, items } = profileCompleteness(viewer, d, pieces ?? 0, payout?.payout_upi ?? null);
  const todo = items.filter((i) => !i.done);
  const customSkills = d.skills.filter((s) => !SKILLS.includes(s));
  const customTools = d.tools.filter((t) => !TOOLS.includes(t));
  const cities = viewer.city && !CITIES.includes(viewer.city) ? [viewer.city, ...CITIES] : CITIES;

  return (
    <div>
      <PageHeader
        title="Your profile"
        sub="This is what clients see when they find you. A complete profile gets more invites."
        action={d.slug ? <LinkButton href={`/d/${d.slug}`} variant="secondary"><ExternalLink size={16} /> View public profile</LinkButton> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ActionForm action={saveProfile} className="order-2 gap-6 lg:order-1">
          <Section title="About you">
            <AvatarField userId={viewer.id} name={viewer.full_name} initial={viewer.avatar_url} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name"><Input name="full_name" defaultValue={viewer.full_name} maxLength={80} required /></Field>
              <Field label="City">
                <Select name="city" defaultValue={viewer.city ?? ""}>
                  {["", ...cities].map((c) => <option key={c} value={c}>{c || "Choose…"}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Headline" hint="One line on what you do and for whom. For example: Brand and packaging designer for D2C food brands.">
              <Input name="headline" defaultValue={d.headline} maxLength={90} />
            </Field>
            <Field label="Bio" hint="A few lines in your own voice: the kind of work you love, clients you've helped, how you like to work.">
              <Textarea name="bio" defaultValue={d.bio} maxLength={2000} className="min-h-32" />
            </Field>
          </Section>

          <Section title="Skills and tools" sub="Pick what you'd be happy to be hired for. These decide which jobs we show you.">
            <Field label="Disciplines"><ChipGroup name="disciplines" options={DISCIPLINES} selected={d.disciplines} /></Field>
            <Field label="Skills"><ChipGroup name="skills" options={SKILLS} selected={d.skills} /></Field>
            <Field label="Other skills" hint="Optional. Separate with commas.">
              <Input name="skills_extra" defaultValue={customSkills.join(", ")} placeholder="Packaging dielines, Kannada lettering" />
            </Field>
            <Field label="Tools"><ChipGroup name="tools" options={TOOLS} selected={d.tools} /></Field>
            <Field label="Other tools" hint="Optional. Separate with commas.">
              <Input name="tools_extra" defaultValue={customTools.join(", ")} placeholder="Affinity Designer, Rive" />
            </Field>
            <Field label="Languages you work in"><ChipGroup name="languages" options={LANGUAGES} selected={d.languages} /></Field>
          </Section>

          <Section title="Rate and availability">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Years of experience">
                <Input name="years_experience" type="number" min={0} max={60} defaultValue={d.years_experience} />
              </Field>
              <Field label="Hourly rate (₹)" hint="Your AI review suggests a fair range.">
                <Input name="hourly_rate" type="number" min={0} max={100000} step={50} defaultValue={d.hourly_rate ?? ""} placeholder="1200" />
              </Field>
              <Field label="Availability">
                <Select name="availability" defaultValue={d.availability}>
                  <option value="available">Available for new projects</option>
                  <option value="limited">Limited availability</option>
                  <option value="unavailable">Not taking work</option>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Links" sub="Clients often check these before inviting you.">
            <div className="grid gap-5 sm:grid-cols-2">
              {LINK_FIELDS.map((l) => (
                <Field key={l.key} label={l.label}>
                  <Input name={`link_${l.key}`} defaultValue={d.links?.[l.key] ?? ""} placeholder={l.placeholder} />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Payouts" sub="Where we send your money when a client releases a milestone. Only you and our payments team can see this.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="UPI ID" hint="For example: yourname@okhdfcbank">
                <Input name="payout_upi" defaultValue={payout?.payout_upi ?? ""} placeholder="yourname@okaxis" autoComplete="off" />
              </Field>
              <Field label="PAN (last 4 characters)" hint="Needed for TDS. We never ask for your full PAN here.">
                <Input name="pan_last4" defaultValue={payout?.pan_last4 ?? ""} maxLength={4} placeholder="234F" className="font-mono uppercase" autoComplete="off" />
              </Field>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-paper-50 px-4 py-3 text-sm">
              <ShieldCheck size={16} className={d.kyc_verified ? "text-success-600" : "text-ink-400"} />
              <span className="text-ink-700">KYC</span>
              {d.kyc_verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Pending verification</Badge>}
              {!d.kyc_verified && <span className="text-xs text-ink-500">Our team checks this before your first payout.</span>}
            </div>
          </Section>

          <SubmitButton size="lg" pending="Saving…" className="self-end">Save profile</SubmitButton>
        </ActionForm>

        <aside className="order-1 lg:order-2">
          <Card className="p-5 lg:sticky lg:top-24">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-ink-900">Profile strength</h2>
              <span className="font-display text-2xl font-semibold tabular">{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-100">
              <div className={pct === 100 ? "h-full rounded-full bg-marigold-500" : "h-full rounded-full bg-ink-900"} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-500">{pct === 100 ? "Your profile is complete. Nice work." : `${todo.length} thing${todo.length === 1 ? "" : "s"} left to make your profile stand out.`}</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {items.map((i) => (
                <li key={i.label} className="flex items-start gap-2">
                  {i.done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-ink-300" />}
                  <span className={i.done ? "text-ink-400" : "text-ink-800"}>{i.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
