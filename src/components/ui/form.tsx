import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-md border border-paper-200 bg-paper-0 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100";

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-ink-500">{hint}</span>}
      {error && <span className="text-xs text-danger-600">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10 py-0", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-10 py-0", className)} {...props}>
      {children}
    </select>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600" role="alert">{message}</p>;
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-600" role="status">{message}</p>;
}
