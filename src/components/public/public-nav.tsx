import Link from "next/link";
import { getViewer, homeFor } from "@/lib/auth";
import { Logo } from "@/components/shell/logo";
import { LinkButton } from "@/components/ui/button";

export async function PublicNav() {
  const viewer = await getViewer();
  return (
    <header className="sticky top-0 z-20 border-b border-paper-200 bg-paper-50/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-8">
        <Logo />
        <nav className="hidden flex-1 items-center gap-6 text-sm text-ink-600 md:flex">
          <Link href="/#designers" className="hover:text-ink-900">For designers</Link>
          <Link href="/#clients" className="hover:text-ink-900">For clients</Link>
          <Link href="/how-ai-scoring-works" className="hover:text-ink-900">How AI scoring works</Link>
          <Link href="/pricing" className="hover:text-ink-900">Pricing</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <LinkButton href={homeFor(viewer.role)}>Go to dashboard</LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost">Log in</LinkButton>
              <LinkButton href="/signup">Get started</LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
