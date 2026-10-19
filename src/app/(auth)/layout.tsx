import { Logo } from "@/components/shell/logo";
import { SetupNotice } from "@/components/setup-notice";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-10">
          <SetupNotice />
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="absolute -right-24 -top-24 h-[520px] w-[520px] rounded-full bg-marigold-500" />
        <div className="absolute -bottom-32 left-24 h-[360px] w-[360px] rounded-full bg-violet-500" />
        <div className="relative flex h-full flex-col justify-end p-14 text-paper-50">
          <p className="max-w-md font-display text-4xl font-bold leading-tight">Where Indian designers get seen, hired and paid.</p>
          <p className="mt-4 max-w-md text-paper-200">AI portfolio reviews, a skill roadmap that grows your rate, and milestone escrow so every rupee is safe.</p>
        </div>
      </div>
    </div>
  );
}
