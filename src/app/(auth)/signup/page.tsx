import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUp } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";

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
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="I want to">
        {(
          [
            ["designer", "Find work", "I'm a designer"],
            ["client", "Hire designers", "I'm a business"],
          ] as const
        ).map(([value, title, sub]) => (
          <Link
            key={value}
            href={`/signup?role=${value}`}
            replace
            scroll={false}
            role="radio"
            aria-checked={role === value}
            className={`rounded-md border bg-paper-0 p-3 ${role === value ? "border-ink-900 ring-1 ring-ink-900" : "border-paper-200 hover:border-ink-300"}`}
          >
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-ink-500">{sub}</div>
          </Link>
        ))}
      </div>
      <GoogleButton role={role} />
      <AuthForm action={signUp}>
        <input type="hidden" name="role" value={role} />
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
