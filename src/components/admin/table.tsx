import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Plain admin table in a card, scrolls sideways on small screens. */
export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-paper-200 bg-paper-0 shadow-card", className)}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-paper-200 bg-paper-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-200">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-ink-500">{children}</td>
    </tr>
  );
}

/** Pill links used as filters, e.g. role=designer. */
export function FilterTabs({ items, active }: { items: { label: string; href: string; key: string }[]; active: string }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-paper-200 bg-paper-0 p-1 text-sm sm:w-fit">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={cn("rounded-full px-3.5 py-1.5 font-medium", it.key === active ? "bg-ink-900 text-paper-50" : "text-ink-600 hover:bg-paper-100")}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ page, hasNext, base }: { page: number; hasNext: boolean; base: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="font-medium text-ink-700 hover:underline" href={`${base}${sep}page=${page - 1}`}>← Newer</Link> : <span />}
      <span className="text-ink-500">Page {page}</span>
      {hasNext ? <Link className="font-medium text-ink-700 hover:underline" href={`${base}${sep}page=${page + 1}`}>Older →</Link> : <span />}
    </div>
  );
}
