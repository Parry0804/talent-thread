import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUp } from "@/app/actions/auth";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const role = sp.role === "client" ? "client" : "designer";
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold">Create your account</h1>
        <p className="mt-1 text-ink-500">Free for designers. Clients get 14 days of Growth free.</p>
      </div>
      <AuthForm action={signUp}>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink-700">I want to</legend>
          {[
            ["designer", "Find work", "I'm a designer"],
            ["client", "Hire designers", "I'm a business"],
          ].map(([value, title, sub]) => (
            <label key={value} className="cursor-pointer rounded-md border border-paper-200 bg-paper-0 p-3 has-[:checked]:border-ink-900 has-[:checked]:ring-1 has-[:checked]:ring-ink-900">
              <input type="radio" name="role" value={value} defaultChecked={role === value} className="sr-only" />
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-ink-500">{sub}</div>
            </label>
          ))}
        </fieldset>
        <Field label="Full name"><Input name="full_name" autoComplete="name" required /></Field>
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" hint="At least 8 characters"><Input name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
        <SubmitButton size="lg" pending="Creating account…">Create account</SubmitButton>
        <p className="text-xs text-ink-500">By continuing you agree to the Terms and Privacy Policy.</p>
      </AuthForm>
      <p className="text-sm text-ink-500">
        Already have an account? <Link href="/login" className="font-medium text-ink-900 underline">Log in</Link>
      </p>
    </>
  );
}
