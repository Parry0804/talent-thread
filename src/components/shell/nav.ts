import type { Role } from "@/lib/types";

export interface NavItem { label: string; href: string; icon: string }

// Mirrors the sidebars in the Figma file (pages 20, 30, 40).
export const NAV: Record<Role, NavItem[]> = {
  designer: [
    { label: "Home", href: "/designer", icon: "home" },
    { label: "Find work", href: "/designer/jobs", icon: "search" },
    { label: "Applications", href: "/designer/applications", icon: "send" },
    { label: "Contracts", href: "/contracts", icon: "file" },
    { label: "Messages", href: "/messages", icon: "chat" },
    { label: "AI analysis", href: "/designer/analysis", icon: "sparkles" },
    { label: "Skill roadmap", href: "/designer/roadmap", icon: "route" },
    { label: "Earnings", href: "/designer/earnings", icon: "wallet" },
    { label: "Portfolio", href: "/designer/portfolio", icon: "image" },
    { label: "Profile", href: "/designer/profile", icon: "user" },
  ],
  client: [
    { label: "Home", href: "/client", icon: "home" },
    { label: "Post a job", href: "/client/jobs/new", icon: "plus" },
    { label: "My jobs", href: "/client/jobs", icon: "briefcase" },
    { label: "Find designers", href: "/client/designers", icon: "search" },
    { label: "Contracts", href: "/contracts", icon: "file" },
    { label: "Messages", href: "/messages", icon: "chat" },
    { label: "Payments", href: "/client/payments", icon: "wallet" },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: "home" },
    { label: "Users", href: "/admin/users", icon: "users" },
    { label: "Jobs", href: "/admin/jobs", icon: "briefcase" },
    { label: "Contracts", href: "/admin/contracts", icon: "file" },
    { label: "Payments", href: "/admin/payments", icon: "wallet" },
    { label: "Disputes", href: "/admin/disputes", icon: "alert" },
    { label: "AI quality", href: "/admin/ai", icon: "sparkles" },
    { label: "Audit log", href: "/admin/audit", icon: "list" },
  ],
};
