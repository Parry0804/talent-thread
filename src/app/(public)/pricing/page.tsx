import { Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { clientCharge, designerPayout, formatINR } from "@/lib/money";
import { FREE_REVIEWS_PER_MONTH } from "@/lib/ai/rubric";
import { cn } from "@/lib/cn";

export const metadata = { title: "Pricing" };

function Plan({ name, price, per, blurb, features, cta, href, featured }: { name: string; price: string; per?: string; blurb: string; features: string[]; cta: string; href: string; featured?: boolean }) {
  return (
    <Card className={cn("flex flex-col p-6 sm:p-8", featured && "border-ink-900 ring-1 ring-ink-900")}>
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-3">
        <span className="font-display text-4xl font-semibold tabular">{price}</span>
        {per && <span className="ml-1 text-sm text-ink-500">{per}</span>}
      </p>
      <p className="mt-2 text-sm text-ink-600">{blurb}</p>
      <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-success-600" /> {f}
          </li>
        ))}
      </ul>
      <LinkButton href={href} variant={featured ? "primary" : "secondary"} className="mt-8">{cta}</LinkButton>
    </Card>
  );
}

export default function PricingPage() {
  const example = 20000;
  const c = clientCharge(example);
  const d = designerPayout(example);
  const r = designerPayout(example, true);
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h1 className="max-w-2xl font-display text-5xl font-bold tracking-tight">Simple pricing, shown in rupees.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-600">Join free. We only earn a fee when a milestone is funded or paid out, and every line is shown before anyone pays.</p>

      <h2 className="mt-14 font-display text-2xl font-semibold">For designers</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Plan
          name="Free"
          price="₹0"
          blurb="Everything you need to get reviewed and hired."
          features={[`${FREE_REVIEWS_PER_MONTH} AI portfolio reviews a month`, "Skill roadmap with weekly tasks", "Apply to unlimited jobs", "Milestone escrow on every contract"]}
          cta="Join as a designer"
          href="/signup?role=designer"
        />
        <Plan
          name="Pro"
          price="₹499"
          per="/month"
          blurb="For designers who review often and want to stand out."
          features={["Unlimited AI portfolio reviews", "Priority in client search", "Pro badge on your profile", "Everything in Free"]}
          cta="Start with Free, upgrade any time"
          href="/signup?role=designer"
          featured
        />
      </div>

      <h2 className="mt-14 font-display text-2xl font-semibold">For clients</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Plan
          name="Starter"
          price="Free"
          per="to post"
          blurb="Post jobs and hire with escrow protection."
          features={["Post jobs for free", "AI-drafted job briefs", "Applicants ranked by fit", "GST invoice for every payment"]}
          cta="Post a job free"
          href="/signup?role=client"
        />
        <Plan
          name="Growth"
          price="₹2,999"
          per="/month"
          blurb="For teams hiring designers every month. 14-day free trial."
          features={["Everything in Starter", "14-day free trial, cancel any time", "Priority support from the Talent Thread team", "Paid plans open soon. Nothing is charged until we tell you"]}
          cta="Start free on Starter"
          href="/signup?role=client"
          featured
        />
      </div>

      <h2 className="mt-14 font-display text-2xl font-semibold">Fees on each milestone</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="p-6 sm:p-8">
          <h3 className="font-semibold">Client pays</h3>
          <p className="mt-1 text-sm text-ink-600">A 3% platform fee, plus 18% GST on that fee. Example for a {formatINR(example)} milestone:</p>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
            <dt className="text-ink-500">Milestone</dt><dd className="text-right tabular">{formatINR(c.amount)}</dd>
            <dt className="text-ink-500">Platform fee (3%)</dt><dd className="text-right tabular">{formatINR(c.fee)}</dd>
            <dt className="text-ink-500">GST on fee (18%)</dt><dd className="text-right tabular">{formatINR(c.gst)}</dd>
            <dt className="border-t border-paper-200 pt-1.5 font-semibold">Total</dt><dd className="border-t border-paper-200 pt-1.5 text-right font-semibold tabular">{formatINR(c.total)}</dd>
          </dl>
        </Card>
        <Card className="p-6 sm:p-8">
          <h3 className="font-semibold">Designer receives</h3>
          <p className="mt-1 text-sm text-ink-600">10% commission (only 5% when the same client hires you again) and 0.1% TDS under Section 194-O, deposited against your PAN.</p>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
            <dt className="text-ink-500">Milestone released</dt><dd className="text-right tabular">{formatINR(d.gross)}</dd>
            <dt className="text-ink-500">Commission (10%)</dt><dd className="text-right tabular">− {formatINR(d.commission)}</dd>
            <dt className="text-ink-500">TDS (0.1%)</dt><dd className="text-right tabular">− {formatINR(d.tds)}</dd>
            <dt className="border-t border-paper-200 pt-1.5 font-semibold">You receive</dt><dd className="border-t border-paper-200 pt-1.5 text-right font-semibold tabular text-marigold-800">{formatINR(d.net)}</dd>
          </dl>
          <p className="mt-3 text-xs text-ink-500">On a repeat hire you&apos;d receive {formatINR(r.net)}.</p>
        </Card>
      </div>
      <p className="mt-8 flex items-center gap-2 text-sm text-ink-500">
        <Sparkles size={14} className="text-violet-500" /> AI reviews and briefs are included in your plan. There are no bidding credits or connect fees.
      </p>
    </div>
  );
}
