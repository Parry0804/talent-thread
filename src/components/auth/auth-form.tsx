"use client";
import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { FormError, FormNotice } from "@/components/ui/form";
import type { ReactNode } from "react";

export function AuthForm({
  action,
  children,
}: {
  action: (state: AuthState, fd: FormData) => Promise<AuthState>;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state?.error} />
      <FormNotice message={state?.notice} />
      {children}
    </form>
  );
}
