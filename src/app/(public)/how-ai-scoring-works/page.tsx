import { Scale, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { BANDS, DIMENSIONS, RUBRIC_VERSION } from "@/lib/ai/rubric";

export const metadata = { title: "How AI scoring works" };

const RATINGS = ["Absent", "Weak", "Adequate", "Strong", "Exceptional"];
const BAND_COPY: Record<string, string> = {
  Exceptional: "Agency-leading work, ready for premium briefs.",
  Strong: "Hireable today for most briefs in your track.",
  Developing: "Solid foundations; a few gaps clients will notice.",
  Emerging: "Early in your journey; your roadmap matters most here.",
};

export default function HowScoringWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-violet-600">
        <Sparkles size={14} /> AI portfolio review
      </p>
      <h1 className="mt-2 font-display text-5xl font-bold tracking-tight">How AI scoring works</h1>
      <p className="mt-4 text-lg text-ink-600">
        Your score is a number from 0 to 100 built from four dimensions that Indian clients care about. Here is exactly how it&apos;s worked out, so there are no surprises.
      </p>

      <Card className="mt-10 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">1. Small checks, rated 0 to 4</h2>
        <p className="mt-2 text-sm text-ink-600">
          First the AI works out your main track (for example packaging or UX) and judges you against that track only. A packaging designer isn&apos;t marked down for missing user research. Then it rates each check:
        </p>
        <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
          {RATINGS.map((r, i) => (
            <div key={r} className="rounded-md bg-paper-50 px-2 py-3">
              <div className="font-display text-xl font-semibold">{i}</div>
              <div className="mt-0.5 text-ink-500">{r}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-600">
          If something isn&apos;t visible in your images or the context you add, it&apos;s marked &ldquo;not shown&rdquo;, not weak. Adding a line about the brief and the outcome for each piece helps a lot.
        </p>
        <h2 className="mt-8 font-display text-xl font-semibold">2. Our code does the maths</h2>
        <p className="mt-2 text-sm text-ink-600">
          Each dimension score is the average of its checks, scaled to 100. Your overall score is the weighted sum of the four dimensions below. The AI never picks the final number itself, so the same ratings always give the same score.
        </p>
      </Card>

      <h2 className="mt-12 font-display text-2xl font-semibold">The four dimensions</h2>
      <div className="mt-5 flex flex-col gap-4">
        {DIMENSIONS.map((d) => (
          <Card key={d.key} className="p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-semibold">{d.name}</h3>
              <span className="rounded-full bg-marigold-100 px-3 py-1 text-sm font-semibold text-marigold-800">{Math.round(d.weight * 100)}% of your score</span>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {d.checks.map((c) => (
                <li key={c.key} className="rounded-md border border-paper-200 p-3 text-sm">
                  <span className="font-medium text-ink-900">{c.name}</span>
                  <span className="block text-ink-600">{c.desc[0].toUpperCase() + c.desc.slice(1)}.</span>
                </li>
              ))}
            </ul>
            <details className="mt-4 rounded-md bg-paper-50">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium">What different scores look like</summary>
              <dl className="flex flex-col gap-2 px-4 pb-4 text-sm">
                {Object.entries(d.anchors).map(([score, text]) => (
                  <div key={score} className="grid grid-cols-[40px_1fr] gap-3">
                    <dt className="font-mono font-semibold tabular">{score}</dt>
                    <dd className="text-ink-600">{text}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-semibold">Bands</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {BANDS.map((b, i) => {
          const max = i === 0 ? 100 : BANDS[i - 1].min - 1;
          return (
            <Card key={b.name} className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{b.name}</span>
                <span className="font-mono text-sm tabular text-ink-500">{b.min}–{max}</span>
              </div>
              <p className="mt-1 text-sm text-ink-600">{BAND_COPY[b.name]}</p>
            </Card>
          );
        })}
      </div>

      <Card className="mt-12 bg-ink-900 p-6 text-paper-50 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Scale size={20} className="text-marigold-500" /> Our fairness promise</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-paper-200">
          <li>Indic scripts, regional aesthetics and Indian visual language are judged on craft and fit for their audience, never against a Western default.</li>
          <li>Style choices that are simply different are neither rewarded nor punished.</li>
          <li>Moderation flags (for example, work that may be copied) never lower your score. A person on our team reviews them.</li>
          <li>Your review is private. You choose whether your score shows on your public profile.</li>
          <li>Each review tells you how confident the AI was and what it couldn&apos;t judge from the images. If something looks wrong, contact us and a human will take a look.</li>
        </ul>
        <p className="mt-6 font-mono text-xs text-ink-400">Rubric version {RUBRIC_VERSION}</p>
      </Card>

      <div className="mt-10 flex flex-wrap gap-3">
        <LinkButton href="/signup?role=designer" size="lg">Get my free AI review</LinkButton>
        <LinkButton href="/pricing" size="lg" variant="secondary">See pricing</LinkButton>
      </div>
    </div>
  );
}
