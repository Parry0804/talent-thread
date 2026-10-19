"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NavIcon } from "@/components/shell/icons";
import type { NavItem } from "@/components/shell/nav";

export function SidebarNav({ items, badges }: { items: NavItem[]; badges?: Record<string, number> }) {
  const path = usePathname();
  const active = (href: string) =>
    path === href || (href !== "/designer" && href !== "/client" && href !== "/admin" && path.startsWith(href + "/"));
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active(it.href) ? "bg-ink-900 text-paper-50" : "text-ink-600 hover:bg-paper-100 hover:text-ink-900",
          )}
        >
          <NavIcon name={it.icon} />
          <span className="flex-1">{it.label}</span>
          {badges?.[it.href] ? (
            <span className="rounded-full bg-marigold-500 px-1.5 text-[11px] font-semibold text-ink-900">{badges[it.href]}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
