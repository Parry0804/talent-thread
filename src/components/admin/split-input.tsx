"use client";
import { useState } from "react";
import { formatINR } from "@/lib/money";

/** Designer share for a split decision: slider and number kept in sync. */
export function SplitInput({ amount, name = "designer_pct", defaultValue = 50 }: { amount: number; name?: string; defaultValue?: number }) {
  const [pct, setPct] = useState(defaultValue);
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
  const designer = Math.round((amount * pct) / 100);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={pct}
          onChange={(e) => setPct(clamp(Number(e.target.value)))}
          className="flex-1 accent-ink-900"
          aria-label="Designer share (slider)"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            name={name}
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setPct(clamp(Number(e.target.value)))}
            className="h-10 w-20 rounded-md border border-paper-200 bg-paper-0 px-3 text-sm tabular"
            aria-label="Designer share in percent"
          />
          <span className="text-sm text-ink-500">%</span>
        </div>
      </div>
      <p className="text-sm text-ink-600">
        Designer gets <span className="font-semibold text-ink-900">{formatINR(designer)}</span> (before commission and TDS) · client is refunded{" "}
        <span className="font-semibold text-ink-900">{formatINR(amount - designer)}</span>
      </p>
    </div>
  );
}
