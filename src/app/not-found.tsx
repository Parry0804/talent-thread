import { Logo } from "@/components/shell/logo";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center border-b border-paper-200 px-6"><Logo /></header>
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-display text-7xl font-bold text-marigold-500">404</p>
        <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="text-ink-600">The link may be old, or you may not have access to it. Contracts and chats are only visible to the people on them.</p>
        <div className="flex gap-3">
          <LinkButton href="/">Go to the home page</LinkButton>
          <LinkButton href="/login" variant="secondary">Log in</LinkButton>
        </div>
      </main>
    </div>
  );
}
