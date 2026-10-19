import { requireOnboarded } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PlanCard } from "@/components/shell/plan-card";

export default async function ClientLayout({ children }: LayoutProps<"/client">) {
  const viewer = await requireOnboarded("client");
  return <AppShell viewer={viewer} aside={<PlanCard viewer={viewer} />}>{children}</AppShell>;
}
