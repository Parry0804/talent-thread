"use client";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/components/ui/button";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
  formAction,
}: {
  children: ReactNode;
  pending?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const status = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={status.pending}
      name={name}
      value={value}
      formAction={formAction}
    >
      {status.pending ? (pending ?? "Working…") : children}
    </Button>
  );
}
