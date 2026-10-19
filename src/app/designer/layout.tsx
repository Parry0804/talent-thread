import { requireOnboarded } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PlanCard } from "@/components/shell/plan-card";

export default async function DesignerLayout({ children }: LayoutProps<"/designer">) {
  const viewer = await requireOnboarded("designer");
  return <AppShell viewer={viewer} aside={<PlanCard viewer={viewer} />}>{children}</AppShell>;
}
