import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/** Violet "92% fit" pill. Fit is computed by our matching code, shown in the AI colour. */
export function FitPill({ score, reason, className }: { score: number; reason?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600", className)}>
      <Sparkles size={12} aria-hidden />
      <span className="font-semibold tabular">{score}% fit</span>
      {reason && <span className="text-violet-600/80">· {reason}</span>}
    </span>
  );
}
