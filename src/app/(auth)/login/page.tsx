import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Field, Input, FormError, FormNotice } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-ink-500">Log in to your Talent Thread account.</p>
      </div>
      {sp.reset && <FormNotice message="Password updated. Log in with your new password." />}
      {sp.error === "google" && <FormError message="Google sign-in isn't available right now. Please use your email instead." />}
      {sp.error === "link" && (
        <FormError
          message={`We couldn't finish signing you in. Please try again.${typeof sp.reason === "string" ? ` (Reason: ${sp.reason})` : ""}`}
        />
      )}
      <GoogleButton next={next || undefined} />
      <AuthForm action={signIn}>
        <input type="hidden" name="next" value={next} />
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <Link href="/forgot-password" className="-mt-2 self-end text-sm text-violet-600 hover:underline">Forgot password?</Link>
        <SubmitButton size="lg" pending="Logging in…">Log in</SubmitButton>
      </AuthForm>
      <p className="text-sm text-ink-500">
        New here? <Link href="/signup" className="font-medium text-ink-900 underline">Create an account</Link>
      </p>
    </>
  );
}
