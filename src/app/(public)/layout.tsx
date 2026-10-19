import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { SetupNotice } from "@/components/setup-notice";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-8"><SetupNotice /></div>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
