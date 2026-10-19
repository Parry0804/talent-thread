import Link from "next/link";
import { Logo } from "@/components/shell/logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-paper-200 bg-paper-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">Where Indian designers get seen, hired and paid. Made in India, for Indian designers and the brands that hire them.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-ink-900">Designers</span>
          <Link href="/signup?role=designer" className="text-ink-500 hover:text-ink-900">Get your AI review</Link>
          <Link href="/how-ai-scoring-works" className="text-ink-500 hover:text-ink-900">How scoring works</Link>
          <Link href="/pricing" className="text-ink-500 hover:text-ink-900">Designer plans</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-ink-900">Clients</span>
          <Link href="/signup?role=client" className="text-ink-500 hover:text-ink-900">Post a job</Link>
          <Link href="/#escrow" className="text-ink-500 hover:text-ink-900">Milestone escrow</Link>
          <Link href="/pricing" className="text-ink-500 hover:text-ink-900">Client plans</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-ink-900">Talent Thread</span>
          <Link href="/login" className="text-ink-500 hover:text-ink-900">Log in</Link>
          <Link href="/signup" className="text-ink-500 hover:text-ink-900">Create an account</Link>
        </div>
      </div>
      <div className="border-t border-paper-200">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-400 sm:px-8">
          © {new Date().getFullYear()} Talent Thread. Payments are processed by Razorpay. Prices in Indian rupees; GST extra where shown.
        </p>
      </div>
    </footer>
  );
}
