"use client";
import { useActionState, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError, FormNotice } from "@/components/ui/form";
import type { ActionState } from "@/components/ui/action-form";
import { cn } from "@/lib/cn";

/**
 * A button that asks "are you sure?" on the page (no window.confirm) before
 * running a server action. Hidden `fields` are sent with the form.
 */
export function ConfirmForm({
  action,
  fields,
  label,
  confirmLabel,
  message,
  variant = "primary",
  confirmVariant,
  size = "md",
  children,
  className,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: ReactNode;
  confirmLabel: ReactNode;
  message: ReactNode;
  variant?: ButtonVariant;
  confirmVariant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  /** Extra inputs shown in the confirm step, e.g. a reason. */
  children?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (!result?.error) setOpen(false);
    return result;
  }, undefined);

  if (!open) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <FormNotice message={state?.notice} />
        <div>
          <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
            {label}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <form action={formAction} className={cn("flex flex-col gap-3 rounded-md border border-paper-200 bg-paper-50 p-4", className)}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="text-sm text-ink-700">{message}</div>
      {children}
      <FormError message={state?.error} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant={confirmVariant ?? variant} size={size} pending="Working…">
          {confirmLabel}
        </SubmitButton>
        <Button type="button" variant="ghost" size={size} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
