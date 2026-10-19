import { requireOnboarded } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

// Pages any signed-in role uses: contracts, messages, notifications.
export default async function SharedLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireOnboarded("designer", "client", "admin");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
