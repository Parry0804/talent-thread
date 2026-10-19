import { ShieldOff } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center border-b border-paper-200 px-6"><Logo /></header>
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-600"><ShieldOff size={26} /></span>
        <h1 className="font-display text-3xl font-semibold">Your account is suspended</h1>
        <p className="text-ink-600">
          The Talent Thread team has paused your account, usually because of a report or a payment problem. Money already held in escrow stays safe while we look into it.
        </p>
        <p className="text-sm text-ink-500">If you think this is a mistake, contact the Talent Thread team and we&apos;ll get back to you within 2 working days.</p>
        <form action={signOut}>
          <Button variant="secondary">Sign out</Button>
        </form>
      </main>
    </div>
  );
}
