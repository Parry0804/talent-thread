"use client";
import { useActionState, type ReactNode } from "react";
import { FormError, FormNotice } from "@/components/ui/form";
import { cn } from "@/lib/cn";

export type ActionState = { error?: string; notice?: string } | undefined;

/** A <form> bound to a server action that returns {error?, notice?}. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={cn("flex flex-col gap-5", className)}>
      <FormError message={state?.error} />
      <FormNotice message={state?.notice} />
      {children}
    </form>
  );
}
