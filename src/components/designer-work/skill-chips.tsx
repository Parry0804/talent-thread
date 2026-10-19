import { cn } from "@/lib/cn";

export function SkillChips({ skills, highlight = [], max }: { skills: string[]; highlight?: string[]; max?: number }) {
  const mine = new Set(highlight.map((s) => s.toLowerCase()));
  const shown = max ? skills.slice(0, max) : skills;
  const rest = skills.length - shown.length;
  if (!skills.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <span
          key={s}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs",
            mine.has(s.toLowerCase()) ? "border-ink-900 bg-ink-900 text-paper-50" : "border-paper-200 bg-paper-50 text-ink-700",
          )}
        >
          {s}
        </span>
      ))}
      {rest > 0 && <span className="px-1 py-0.5 text-xs text-ink-500">+{rest} more</span>}
    </div>
  );
}
