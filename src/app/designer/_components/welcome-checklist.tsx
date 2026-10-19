import Link from "next/link";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export interface ChecklistItem {
  label: string;
  detail: string;
  href: string;
  done: boolean;
  ai?: boolean;
}

export function WelcomeChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
        <div>
          <h2 className="font-semibold text-ink-900">Get ready to win your first project</h2>
          <p className="text-sm text-ink-500">{done} of {items.length} done. Each step makes you easier for clients to pick.</p>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-paper-100" aria-hidden>
          <div className="h-full rounded-full bg-marigold-500" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      </div>
      <ol className="mt-4 divide-y divide-paper-200 border-t border-paper-200">
        {items.map((it, i) => (
          <li key={it.label}>
            <Link href={it.href} className="flex items-center gap-4 px-6 py-4 hover:bg-paper-50">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  it.done ? "bg-ink-900 text-paper-50" : "border border-paper-300 text-ink-500",
                )}
              >
                {it.done ? <Check size={14} aria-label="Done" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("flex items-center gap-1.5 font-medium", it.done ? "text-ink-500 line-through" : "text-ink-900")}>
                  {it.label}
                  {it.ai && <Sparkles size={14} className="text-violet-500" aria-hidden />}
                </span>
                <span className="block text-sm text-ink-500">{it.detail}</span>
              </span>
              <ChevronRight size={16} className="text-ink-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
