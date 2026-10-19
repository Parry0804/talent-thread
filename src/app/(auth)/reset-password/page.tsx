import { AuthForm } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePassword } from "@/app/actions/auth";

export const metadata = { title: "Set a new password" };

export default function ResetPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Set a new password</h1>
      <AuthForm action={updatePassword}>
        <Field label="New password" hint="At least 8 characters"><Input name="password" type="password" minLength={8} required /></Field>
        <SubmitButton size="lg" pending="Saving…">Save new password</SubmitButton>
      </AuthForm>
    </>
  );
}
