import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import type { MilestoneStatus, ApplicationStatus, ContractStatus, JobStatus } from "@/lib/types";

const tones = {
  neutral: "bg-paper-100 text-ink-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-marigold-50 text-marigold-800",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-info-50 text-info-600",
  brand: "bg-violet-50 text-violet-600",
  highlight: "bg-marigold-100 text-marigold-800",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

const milestoneMap: Record<MilestoneStatus, [string, Tone]> = {
  awaiting_funding: ["Awaiting funding", "neutral"],
  funded: ["Funded · in escrow", "info"],
  submitted: ["In review", "warning"],
  changes_requested: ["Changes requested", "warning"],
  approved: ["Approved", "success"],
  released: ["Released", "success"],
  disputed: ["Disputed", "danger"],
  refunded: ["Refunded", "neutral"],
};
export function MilestoneBadge({ status }: { status: MilestoneStatus }) {
  const [label, tone] = milestoneMap[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const appMap: Record<ApplicationStatus, [string, Tone]> = {
  submitted: ["Submitted", "neutral"],
  shortlisted: ["Shortlisted", "brand"],
  rejected: ["Not selected", "neutral"],
  hired: ["Hired", "success"],
  withdrawn: ["Withdrawn", "neutral"],
};
export function ApplicationBadge({ status }: { status: ApplicationStatus }) {
  const [label, tone] = appMap[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const contractMap: Record<ContractStatus, [string, Tone]> = {
  pending: ["Offer sent", "warning"],
  active: ["Active", "info"],
  completed: ["Completed", "success"],
  cancelled: ["Cancelled", "neutral"],
  disputed: ["Disputed", "danger"],
};
export function ContractBadge({ status }: { status: ContractStatus }) {
  const [label, tone] = contractMap[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const jobMap: Record<JobStatus, [string, Tone]> = {
  draft: ["Draft", "neutral"],
  open: ["Open", "success"],
  closed: ["Closed", "neutral"],
  filled: ["Filled", "brand"],
};
export function JobBadge({ status }: { status: JobStatus }) {
  const [label, tone] = jobMap[status];
  return <Badge tone={tone}>{label}</Badge>;
}
