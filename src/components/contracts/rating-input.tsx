import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

const LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

/** 1–5 rating as radio pills. Works without JavaScript. */
export function RatingInput({ name = "rating", defaultValue = 5 }: { name?: string; defaultValue?: number }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {LABELS.map((label, i) => (
        <label
          key={label}
          className={cn(
            "flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-paper-200 bg-paper-0 px-3 py-1.5 text-sm text-ink-700",
            "hover:border-ink-300 has-[:checked]:border-ink-900 has-[:checked]:bg-ink-900 has-[:checked]:text-paper-50",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500",
          )}
        >
          <input type="radio" name={name} value={i + 1} defaultChecked={i + 1 === defaultValue} className="sr-only" />
          <Star size={13} className="text-marigold-500" fill="currentColor" />
          {i + 1} · {label}
        </label>
      ))}
    </div>
  );
}
