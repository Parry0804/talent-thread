// Row shapes for the tables in supabase/migrations. Kept by hand; update both together.
export type Role = "designer" | "client" | "admin";
export type Availability = "available" | "limited" | "unavailable";
export type ReviewStatus = "queued" | "running" | "done" | "failed";
export type JobStatus = "draft" | "open" | "closed" | "filled";
export type ApplicationStatus = "submitted" | "shortlisted" | "rejected" | "hired" | "withdrawn";
export type ContractStatus = "pending" | "active" | "completed" | "cancelled" | "disputed";
export type MilestoneStatus =
  | "awaiting_funding" | "funded" | "submitted" | "changes_requested"
  | "approved" | "released" | "disputed" | "refunded";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
  onboarded: boolean;
  suspended: boolean;
  created_at: string;
}

export interface DesignerProfile {
  id: string;
  slug: string | null;
  headline: string;
  bio: string;
  disciplines: string[];
  skills: string[];
  tools: string[];
  languages: string[];
  years_experience: number;
  hourly_rate: number | null;
  availability: Availability;
  links: Record<string, string>;
  plan: "free" | "pro";
  latest_score: number | null;
  latest_band: string | null;
  score_public: boolean;
  kyc_verified: boolean;
}

/** Private payout details (owner and admins only). */
export interface DesignerPayout {
  id: string;
  payout_upi: string | null;
  pan_last4: string | null;
}

export interface ClientProfile {
  id: string;
  company_name: string;
  company_size: string | null;
  industry: string | null;
  website: string | null;
  gstin: string | null;
  needs: string[];
  typical_budget: string | null;
  plan: "starter" | "growth";
  trial_ends_at: string | null;
}

export interface PortfolioItem {
  id: string;
  designer_id: string;
  title: string;
  description: string;
  category: string;
  image_paths: string[];
  link: string | null;
  sort: number;
  created_at: string;
}

export interface AiReview {
  id: string;
  designer_id: string;
  status: ReviewStatus;
  image_paths: string[];
  context: Record<string, unknown>;
  model: string | null;
  rubric_version: string;
  overall: number | null;
  band: string | null;
  dims: Record<string, number> | null;
  report: import("@/lib/ai/rubric").ReviewReport | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Job {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  deliverables: string[];
  budget_type: "fixed" | "hourly";
  budget_min: number;
  budget_max: number;
  timeline_weeks: number | null;
  experience_level: string | null;
  location_pref: string | null;
  status: JobStatus;
  brief: Record<string, unknown> | null;
  attachment_paths: string[];
  created_at: string;
  published_at: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  designer_id: string;
  cover_letter: string;
  proposed_amount: number;
  timeline_days: number | null;
  portfolio_item_ids: string[];
  status: ApplicationStatus;
  fit_score: number | null;
  fit_reasons: string[];
  created_at: string;
}

export interface Contract {
  id: string;
  code: string;
  job_id: string | null;
  application_id: string | null;
  client_id: string;
  designer_id: string;
  title: string;
  scope: string;
  total_amount: number;
  status: ContractStatus;
  repeat_hire: boolean;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface Milestone {
  id: string;
  contract_id: string;
  seq: number;
  title: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: MilestoneStatus;
  revision_count: number;
  funded_at: string | null;
  submitted_at: string | null;
  auto_approve_at: string | null;
  approved_at: string | null;
  released_at: string | null;
}

export interface Message {
  id: string;
  contract_id: string;
  sender_id: string;
  body: string;
  file_path: string | null;
  is_system: boolean;
  created_at: string;
  read_at: string | null;
}

export interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  raised_by: string;
  reason: string;
  details: string;
  evidence_paths: string[];
  status: "open" | "resolved";
  resolution: "release" | "refund" | "split" | null;
  designer_share_pct: number | null;
  admin_note: string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
