import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireRole("admin");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
