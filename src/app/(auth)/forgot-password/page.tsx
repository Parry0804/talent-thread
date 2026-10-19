import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestReset } from "@/app/actions/auth";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-ink-500">We&apos;ll email you a link to set a new one.</p>
      </div>
      <AuthForm action={requestReset}>
        <Field label="Email"><Input name="email" type="email" required /></Field>
        <SubmitButton size="lg" pending="Sending…">Send reset link</SubmitButton>
      </AuthForm>
      <Link href="/login" className="text-sm text-ink-500 underline">Back to log in</Link>
    </>
  );
}
