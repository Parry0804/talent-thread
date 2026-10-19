import { cn } from "@/lib/cn";
import { bandFor } from "@/lib/ai/rubric";

const bandTone: Record<string, string> = {
  Exceptional: "bg-violet-50 text-violet-600",
  Strong: "bg-success-50 text-success-600",
  Developing: "bg-marigold-50 text-marigold-800",
  Emerging: "bg-info-50 text-info-600",
};

export function BandBadge({ score, className }: { score: number; className?: string }) {
  const band = bandFor(score);
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", bandTone[band], className)}>{band}</span>;
}

/** Marigold ring with the score in the middle (Figma "Score" component). */
export function ScoreRing({ score, size = 160, label = "out of 100" }: { score: number; size?: number; label?: string }) {
  const stroke = Math.max(6, Math.round(size / 14));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-marigold-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display font-bold leading-none tabular" style={{ fontSize: size * 0.32 }}>{score}</div>
        {size >= 100 && <div className="mt-1 text-xs text-ink-500">{label}</div>}
      </div>
    </div>
  );
}

export function ScoreBar({ label, weight, score }: { label: string; weight?: number; score: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
      <span className="text-sm font-medium text-ink-800">
        {label}
        {weight != null && <span className="ml-2 font-normal text-ink-400">{Math.round(weight * 100)}%</span>}
      </span>
      <span className="font-mono text-sm tabular">{score}</span>
      <div className="col-span-2 h-2 overflow-hidden rounded-full bg-paper-100">
        <div className="h-full rounded-full bg-ink-900" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
