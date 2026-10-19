import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const variants = {
  primary: "bg-ink-900 text-paper-50 hover:bg-ink-700",
  brand: "bg-violet-500 text-white hover:bg-violet-600",
  secondary: "bg-paper-0 text-ink-900 border border-paper-200 hover:border-ink-300",
  ghost: "text-ink-700 hover:bg-paper-100",
  danger: "bg-danger-600 text-white hover:opacity-90",
  highlight: "bg-marigold-500 text-ink-900 hover:bg-marigold-600",
} as const;
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-5 text-sm", lg: "h-12 px-6 text-[15px]" } as const;

export type ButtonVariant = keyof typeof variants;
type Common = { variant?: ButtonVariant; size?: keyof typeof sizes };

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof sizes = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & Common) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
