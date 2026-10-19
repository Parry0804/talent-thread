import { cn } from "@/lib/cn";

const WORDS = ["Not shown", "Weak", "Adequate", "Strong", "Exceptional"];

/** A 0–4 check rating as four dots plus a word, so it never relies on colour alone. */
export function CheckDots({ name, desc, value }: { name: string; desc: string; value: number }) {
  const v = Math.max(0, Math.min(4, Math.round(value)));
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink-900">{name}</div>
        <div className="text-xs text-ink-500">{desc}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1" aria-label={`${name}: ${v} of 4, ${WORDS[v]}`}>
        <div className="flex gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-2.5 w-2.5 rounded-full", i <= v ? (v === 4 ? "bg-marigold-500" : "bg-ink-900") : "bg-paper-200")} />
          ))}
        </div>
        <span className="text-[11px] text-ink-500">{WORDS[v]}</span>
      </div>
    </div>
  );
}
