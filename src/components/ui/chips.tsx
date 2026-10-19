import { cn } from "@/lib/cn";

/** Multi-select checkboxes styled as pills. Works without JavaScript. */
export function ChipGroup({ name, options, selected = [], type = "checkbox" }: { name: string; options: string[]; selected?: string[]; type?: "checkbox" | "radio" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o}
          className={cn(
            "cursor-pointer select-none rounded-full border border-paper-200 bg-paper-0 px-3 py-1.5 text-sm text-ink-700 transition-colors",
            "hover:border-ink-300 has-[:checked]:border-ink-900 has-[:checked]:bg-ink-900 has-[:checked]:text-paper-50",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500",
          )}
        >
          <input type={type} name={name} value={o} defaultChecked={selected.includes(o)} className="sr-only" />
          {o}
        </label>
      ))}
    </div>
  );
}
