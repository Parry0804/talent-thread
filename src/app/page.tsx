import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, FileText, Lock, Route, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { SetupNotice } from "@/components/setup-notice";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score";
import { DIMENSIONS } from "@/lib/ai/rubric";
import { AUTO_APPROVE_DAYS, MAX_REVISIONS } from "@/lib/money";

function Step({ n, icon, title, body, ai }: { n: number; icon: React.ReactNode; title: string; body: string; ai?: boolean }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <span className={ai ? "grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-600" : "grid h-10 w-10 place-items-center rounded-full bg-paper-100 text-ink-800"}>{icon}</span>
        <span className="font-mono text-xs text-ink-400">0{n}</span>
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-ink-600">{body}</p>
    </Card>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-8"><SetupNotice /></div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-paper-0 px-3 py-1 text-xs font-medium text-ink-600 ring-1 ring-paper-200">
              <span className="h-1.5 w-1.5 rounded-full bg-marigold-500" /> For India&apos;s graphic and UX/UI designers
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
              Where Indian designers get seen, hired and paid.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-600">
              An honest AI review of your portfolio, a roadmap to raise your rate, and clients who pay through milestone escrow, so every rupee is safe before work starts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/signup?role=designer" size="lg">I&apos;m a designer <ArrowRight size={16} /></LinkButton>
              <LinkButton href="/signup?role=client" size="lg" variant="secondary">I want to hire</LinkButton>
            </div>
            <p className="mt-4 text-sm text-ink-500">Free to join. 3 AI portfolio reviews every month on the free plan.</p>
          </div>
          <div className="relative">
            <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-marigold-100" aria-hidden />
            <Card className="relative p-6 shadow-raised">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600">
                <Sparkles size={14} /> AI portfolio review
              </div>
              <div className="mt-4 flex items-center gap-6">
                <ScoreRing score={78} size={128} />
                <div className="flex flex-col gap-2 text-sm">
                  {DIMENSIONS.map((d) => (
                    <div key={d.key} className="flex items-center justify-between gap-6">
                      <span className="text-ink-600">{d.name.split(" & ")[0]}</span>
                      <span className="font-mono text-xs text-ink-400">{Math.round(d.weight * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-5 rounded-md bg-paper-50 p-3 text-sm text-ink-700">
                &ldquo;Your packaging work is strong. Show the process behind the Diwali range and you&apos;re ready for higher-budget D2C briefs.&rdquo;
              </p>
              <p className="mt-2 text-xs text-ink-400">Example of what a review looks like</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Designers */}
      <section id="designers" className="border-t border-paper-200 bg-paper-0">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">For designers</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold tracking-tight">Know where you stand. Grow your rate. Get paid on time.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step n={1} ai icon={<Sparkles size={18} />} title="Get an AI review" body="Upload up to 10 pieces. A senior-creative-director-style review scores you 0–100 with specific, kind fixes for each image." />
            <Step n={2} ai icon={<Route size={18} />} title="Follow your roadmap" body="Three skills that would move your score and your rate most, broken into weekly tasks you can tick off." />
            <Step n={3} icon={<Briefcase size={18} />} title="Get hired" body="Apply to jobs from Indian startups, D2C brands and agencies. Clients see why you fit their brief." />
            <Step n={4} icon={<Wallet size={18} />} title="Paid via escrow" body={`The client funds each milestone before you start. Approved work is released to you, and silence auto-approves after ${AUTO_APPROVE_DAYS} days.`} />
          </div>
        </div>
      </section>

      {/* Clients */}
      <section id="clients" className="border-t border-paper-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">For clients</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold tracking-tight">Hire the right designer without the guesswork.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step n={1} ai icon={<Sparkles size={18} />} title="AI writes your brief" body="Describe what you need in plain words. We turn it into a clear brief with deliverables and a fair budget." />
            <Step n={2} ai icon={<Target size={18} />} title="Ranked by fit" body="Applicants are ranked by skills, track record and portfolio quality for your brief, with reasons you can read." />
            <Step n={3} icon={<Lock size={18} />} title="Milestone escrow" body="Pay milestone by milestone. Money is held safely and only released when you approve the work." />
            <Step n={4} icon={<FileText size={18} />} title="GST invoices" body="Every payment comes with a GST invoice. Add your GSTIN to claim input tax credit on our fee." />
          </div>
        </div>
      </section>

      {/* AI review explained */}
      <section className="bg-ink-900 text-paper-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-200">
              <Sparkles size={14} /> The AI review, explained
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Four things clients actually look for.</h2>
            <p className="mt-4 text-paper-200">
              The AI rates small, concrete checks from 0 to 4. Our code, not the AI, turns those into your score, so the maths is the same for everyone. It judges Indic type and Indian visual language on their own terms, never against a Western default.
            </p>
            <Link href="/how-ai-scoring-works" className="mt-6 inline-flex items-center gap-2 font-medium text-marigold-300 hover:underline">
              Read the full rubric <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="rounded-lg border border-ink-700 bg-ink-800 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{d.name}</h3>
                  <span className="font-display text-2xl font-semibold text-marigold-500">{Math.round(d.weight * 100)}%</span>
                </div>
                <p className="mt-2 text-sm text-paper-200">{d.checks.map((c) => c.name).join(" · ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Escrow explained */}
      <section id="escrow" className="border-b border-paper-200 bg-paper-0">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">Milestone escrow</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold tracking-tight">The money is there before the work starts.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { icon: <FileText size={18} />, t: "Agree milestones", b: "The client sends an offer split into milestones. The designer accepts." },
              { icon: <Lock size={18} />, t: "Client funds", b: "Each milestone is paid into escrow by UPI, card or netbanking through Razorpay." },
              { icon: <BadgeCheck size={18} />, t: "Review the work", b: `The designer submits. The client approves or asks for changes (up to ${MAX_REVISIONS} rounds). No reply in ${AUTO_APPROVE_DAYS} days means it's approved.` },
              { icon: <ShieldCheck size={18} />, t: "Released, or resolved", b: "Approved money goes to the designer. If something goes wrong, either side can raise a dispute and our team decides." },
            ].map((s, i) => (
              <li key={s.t} className="relative rounded-lg border border-paper-200 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-marigold-100 text-marigold-800">{s.icon}</span>
                <p className="mt-4 font-mono text-xs text-ink-400">Step {i + 1}</p>
                <h3 className="mt-1 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-600">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing summary */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">Pricing</p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Free to start. Fees only when money moves.</h2>
            </div>
            <LinkButton href="/pricing" variant="secondary">See full pricing</LinkButton>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <h3 className="font-semibold">Designers</h3>
              <p className="mt-2 text-sm text-ink-600">Free with 3 AI reviews a month, or Pro at ₹499/month. 10% commission on earnings (5% when a client hires you again), plus 0.1% TDS.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold">Clients</h3>
              <p className="mt-2 text-sm text-ink-600">Posting jobs is free on Starter. Growth is ₹2,999/month with a 14-day free trial. A 3% fee + GST on each milestone you fund.</p>
            </Card>
            <Card className="bg-marigold-50 p-6">
              <h3 className="font-semibold">No surprises</h3>
              <p className="mt-2 text-sm text-ink-700">Every fee, GST and TDS line is shown before anyone pays. No hidden FX, no bidding credits.</p>
            </Card>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-ink-900 px-6 py-10 text-center">
            <p className="w-full font-display text-2xl font-semibold text-paper-50">Ready when you are.</p>
            <LinkButton href="/signup?role=designer" variant="highlight" size="lg">I&apos;m a designer</LinkButton>
            <LinkButton href="/signup?role=client" variant="secondary" size="lg">I want to hire</LinkButton>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
