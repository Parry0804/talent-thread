"use client";
import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { applyToJob } from "@/app/designer/jobs/actions";
import { designerPayout, formatINR, COMMISSION_RATE, REPEAT_HIRE_COMMISSION_RATE } from "@/lib/money";
import { cn } from "@/lib/cn";

export interface ApplyPortfolioItem {
  id: string;
  title: string;
  category: string;
  thumb: string | null;
}

export function ApplyForm({
  jobId,
  suggestedAmount,
  suggestedDays,
  repeatHire,
  items,
}: {
  jobId: string;
  suggestedAmount: number;
  suggestedDays: number | null;
  repeatHire: boolean;
  items: ApplyPortfolioItem[];
}) {
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [picked, setPicked] = useState<string[]>([]);
  // Controlled so text survives React's automatic form reset when the action returns an error.
  const [cover, setCover] = useState("");
  const [days, setDays] = useState(suggestedDays ? String(suggestedDays) : "");
  const n = Math.max(0, Math.round(Number(amount) || 0));
  const p = designerPayout(n, repeatHire);
  const pct = Math.round((repeatHire ? REPEAT_HIRE_COMMISSION_RATE : COMMISSION_RATE) * 100);

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));

  return (
    <ActionForm action={applyToJob}>
      <input type="hidden" name="job_id" value={jobId} />
      <Field
        label="Cover letter"
        hint={
          <span className="flex items-start gap-1.5">
            <Lightbulb size={13} className="mt-0.5 shrink-0" aria-hidden />
            Clients read dozens of these. Open with how you&apos;d tackle their brief, point to one similar project, and keep it under 200 words.
          </span>
        }
      >
        <Textarea name="cover_letter" value={cover} onChange={(e) => setCover(e.target.value)} required minLength={80} maxLength={5000} rows={7} placeholder="Hi! I'd start with a short discovery call to understand your customers, then…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your price (₹)" hint="The total for the whole project.">
          <Input name="proposed_amount" type="number" min={1} step={100} required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Timeline (days)">
          <Input name="timeline_days" type="number" min={1} max={365} required value={days} onChange={(e) => setDays(e.target.value)} placeholder="14" />
        </Field>
      </div>

      <div className="rounded-md bg-paper-100 px-4 py-3 text-sm">
        <div className="flex justify-between text-ink-600"><span>Your price</span><span className="tabular">{formatINR(p.gross)}</span></div>
        <div className="flex justify-between text-ink-600"><span>Talent Thread commission ({pct}%{repeatHire ? ", repeat client" : ""})</span><span className="tabular">− {formatINR(p.commission)}</span></div>
        <div className="flex justify-between text-ink-600"><span>TDS under 194-O (0.1%)</span><span className="tabular">− {formatINR(p.tds)}</span></div>
        <div className="mt-2 flex justify-between border-t border-paper-200 pt-2 font-semibold text-ink-900">
          <span>You&apos;ll receive</span><span className="tabular">{formatINR(p.net)}</span>
        </div>
        <p className="mt-1.5 text-xs text-ink-500">
          You&apos;ll receive {formatINR(p.net)} after {pct}% commission and 0.1% TDS. The client pays their own platform fee on top.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink-700">Attach 1–3 portfolio pieces <span className="font-normal text-ink-500">({picked.length}/3)</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((it) => {
            const on = picked.includes(it.id);
            return (
              <label
                key={it.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm transition-colors",
                  on ? "border-ink-900 bg-paper-50" : "border-paper-200 hover:border-ink-300",
                  !on && picked.length >= 3 && "cursor-not-allowed opacity-50",
                )}
              >
                <input type="checkbox" name="portfolio_item_ids" value={it.id} checked={on} onChange={() => toggle(it.id)} className="sr-only" />
                <span className="h-10 w-12 shrink-0 overflow-hidden rounded bg-paper-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.thumb && <img src={it.thumb} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-900">{it.title}</span>
                  <span className="block text-xs text-ink-500">{it.category}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <SubmitButton size="lg" pending="Sending…" className="self-start">Send application</SubmitButton>
    </ActionForm>
  );
}
