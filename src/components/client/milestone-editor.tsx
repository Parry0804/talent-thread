"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { clientCharge, formatINR } from "@/lib/money";

export interface MilestoneRow { title: string; description: string; amount: number; due_date: string }

const control =
  "w-full rounded-md border border-paper-200 bg-paper-0 px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100";

/** Dynamic milestone list for the offer builder. Serialises to a hidden `milestones` JSON input. */
export function MilestoneEditor({ initial }: { initial: MilestoneRow[] }) {
  const [rows, setRows] = useState<MilestoneRow[]>(initial.length ? initial : [{ title: "", description: "", amount: 0, due_date: "" }]);
  const set = (i: number, patch: Partial<MilestoneRow>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const charges = rows.map((r) => clientCharge(Math.max(0, Math.round(r.amount || 0))));
  const sum = charges.reduce(
    (s, c) => ({ amount: s.amount + c.amount, fee: s.fee + c.fee, gst: s.gst + c.gst, total: s.total + c.total }),
    { amount: 0, fee: 0, gst: 0, total: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="milestones" value={JSON.stringify(rows)} />
      {rows.map((r, i) => (
        <div key={i} className="rounded-md border border-paper-200 bg-paper-0 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-500">Milestone {i + 1}</span>
            {rows.length > 1 && (
              <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-500 hover:bg-paper-100 hover:text-danger-600">
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-700">Title</span>
              <input className={`${control} h-10`} value={r.title} maxLength={120} onChange={(e) => set(i, { title: e.target.value })} placeholder="Concepts and moodboard" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-700">Amount (₹)</span>
              <input className={`${control} h-10 tabular`} type="number" min={1} step={100} value={r.amount || ""} onChange={(e) => set(i, { amount: Number(e.target.value) })} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-700">Due date</span>
              <input className={`${control} h-10`} type="date" value={r.due_date} onChange={(e) => set(i, { due_date: e.target.value })} />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-700">What&apos;s delivered</span>
            <textarea className={`${control} min-h-16 py-2`} value={r.description} maxLength={1000} onChange={(e) => set(i, { description: e.target.value })} placeholder="3 logo directions as PDF, with rationale" />
          </label>
          {charges[i].amount > 0 && (
            <p className="mt-2 text-xs text-ink-500 tabular">
              You&apos;ll pay {formatINR(charges[i].total)} when you fund this: {formatINR(charges[i].amount)} into escrow + {formatINR(charges[i].fee)} platform fee + {formatINR(charges[i].gst)} GST
            </p>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((x) => [...x, { title: "", description: "", amount: 0, due_date: "" }])}
        className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-dashed border-paper-300 px-4 py-2 text-sm text-ink-700 hover:border-ink-300"
        disabled={rows.length >= 10}
      >
        <Plus size={14} /> Add milestone
      </button>

      <div className="rounded-md bg-paper-50 p-4 text-sm tabular">
        <div className="flex justify-between"><span className="text-ink-600">Contract total (to the designer, via escrow)</span><span className="font-semibold">{formatINR(sum.amount)}</span></div>
        <div className="mt-1 flex justify-between text-ink-500"><span>Platform fee (3%)</span><span>{formatINR(sum.fee)}</span></div>
        <div className="mt-1 flex justify-between text-ink-500"><span>GST on fee (18%)</span><span>{formatINR(sum.gst)}</span></div>
        <div className="mt-2 flex justify-between border-t border-paper-200 pt-2 font-display text-lg font-semibold"><span>You pay in total</span><span>{formatINR(sum.total)}</span></div>
        <p className="mt-2 text-xs text-ink-500">Nothing is charged now. You fund one milestone at a time after the designer accepts.</p>
      </div>
    </div>
  );
}
