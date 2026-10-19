-- Talent Thread · initial schema
-- Money is stored in whole rupees (integer) unless a column name ends in _paise.

create extension if not exists pgcrypto;

-- ───────────────────────── Enums ─────────────────────────
create type user_role as enum ('designer', 'client', 'admin');
create type availability as enum ('available', 'limited', 'unavailable');
create type designer_plan as enum ('free', 'pro');
create type client_plan as enum ('starter', 'growth');
create type review_status as enum ('queued', 'running', 'done', 'failed');
create type job_status as enum ('draft', 'open', 'closed', 'filled');
create type budget_type as enum ('fixed', 'hourly');
create type application_status as enum ('submitted', 'shortlisted', 'rejected', 'hired', 'withdrawn');
create type contract_status as enum ('pending', 'active', 'completed', 'cancelled', 'disputed');
create type milestone_status as enum (
  'awaiting_funding', 'funded', 'submitted', 'changes_requested',
  'approved', 'released', 'disputed', 'refunded'
);
create type payment_status as enum ('created', 'paid', 'failed', 'refunded');
create type payout_status as enum ('pending', 'processing', 'paid', 'failed');
create type dispute_status as enum ('open', 'resolved');
create type dispute_resolution as enum ('release', 'refund', 'split');

-- ───────────────────────── People ─────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'designer',
  full_name text not null default '',
  avatar_url text,
  city text,
  phone text,
  onboarded boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table designer_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  slug text unique,
  headline text not null default '',
  bio text not null default '',
  disciplines text[] not null default '{}',
  skills text[] not null default '{}',
  tools text[] not null default '{}',
  languages text[] not null default '{}',
  years_experience int not null default 0 check (years_experience between 0 and 60),
  hourly_rate int check (hourly_rate is null or hourly_rate between 0 and 100000),
  availability availability not null default 'available',
  links jsonb not null default '{}'::jsonb,
  plan designer_plan not null default 'free',
  latest_score int check (latest_score is null or latest_score between 0 and 100),
  latest_band text,
  score_public boolean not null default false,
  payout_upi text,
  pan_last4 text,
  kyc_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create table client_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  company_name text not null default '',
  company_size text,
  industry text,
  website text,
  gstin text,
  needs text[] not null default '{}',
  typical_budget text,
  plan client_plan not null default 'starter',
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Portfolio & AI ─────────────────────────
create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references designer_profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Branding',
  image_paths text[] not null default '{}',
  link text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on portfolio_items (designer_id, sort);

create table ai_reviews (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references designer_profiles (id) on delete cascade,
  status review_status not null default 'queued',
  image_paths text[] not null default '{}',
  context jsonb not null default '{}'::jsonb,
  model text,
  rubric_version text not null,
  overall int check (overall is null or overall between 0 and 100),
  band text,
  dims jsonb,
  report jsonb,
  error text,
  is_human_review boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index on ai_reviews (designer_id, created_at desc);

create table roadmaps (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references designer_profiles (id) on delete cascade,
  review_id uuid references ai_reviews (id) on delete set null,
  skills jsonb not null default '[]'::jsonb,
  weeks int not null default 6,
  created_at timestamptz not null default now()
);

create table roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmaps (id) on delete cascade,
  week int not null,
  skill text not null,
  title text not null,
  detail text not null default '',
  resource_url text,
  done boolean not null default false,
  proof_url text,
  sort int not null default 0
);
create index on roadmap_tasks (roadmap_id, week, sort);

-- ───────────────────────── Marketplace ─────────────────────────
create table jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references client_profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'Branding',
  skills text[] not null default '{}',
  deliverables text[] not null default '{}',
  budget_type budget_type not null default 'fixed',
  budget_min int not null default 0,
  budget_max int not null default 0,
  timeline_weeks int,
  experience_level text,
  location_pref text,
  status job_status not null default 'draft',
  brief jsonb,
  attachment_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  check (budget_max >= budget_min)
);
create index on jobs (status, published_at desc);
create index on jobs (client_id);

create table saved_jobs (
  designer_id uuid not null references designer_profiles (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (designer_id, job_id)
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  designer_id uuid not null references designer_profiles (id) on delete cascade,
  cover_letter text not null,
  proposed_amount int not null check (proposed_amount > 0),
  timeline_days int,
  portfolio_item_ids uuid[] not null default '{}',
  status application_status not null default 'submitted',
  fit_score int,
  fit_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (job_id, designer_id)
);
create index on applications (designer_id);

create table invites (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  designer_id uuid not null references designer_profiles (id) on delete cascade,
  client_id uuid not null references client_profiles (id) on delete cascade,
  message text not null default '',
  created_at timestamptz not null default now(),
  unique (job_id, designer_id)
);

-- ───────────────────────── Contracts & escrow ─────────────────────────
create table contracts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default ('TT-' || lpad((floor(random() * 100000))::int::text, 5, '0')),
  job_id uuid references jobs (id) on delete set null,
  application_id uuid references applications (id) on delete set null,
  client_id uuid not null references client_profiles (id),
  designer_id uuid not null references designer_profiles (id),
  title text not null,
  scope text not null default '',
  total_amount int not null default 0,
  status contract_status not null default 'pending',
  repeat_hire boolean not null default false,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);
create index on contracts (client_id);
create index on contracts (designer_id);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  seq int not null,
  title text not null,
  description text not null default '',
  amount int not null check (amount > 0),
  due_date date,
  status milestone_status not null default 'awaiting_funding',
  revision_count int not null default 0,
  funded_at timestamptz,
  submitted_at timestamptz,
  auto_approve_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  unique (contract_id, seq)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones (id) on delete cascade,
  contract_id uuid not null references contracts (id) on delete cascade,
  client_id uuid not null references client_profiles (id),
  amount int not null,            -- milestone amount in ₹
  platform_fee int not null,      -- client-side fee in ₹
  gst int not null,               -- GST on platform fee in ₹
  total_paise bigint not null,    -- what Razorpay charged
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  status payment_status not null default 'created',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null unique references milestones (id) on delete cascade,
  designer_id uuid not null references designer_profiles (id),
  gross int not null,
  commission int not null,
  tds int not null,
  net int not null,
  status payout_status not null default 'pending',
  reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones (id) on delete cascade,
  designer_id uuid not null references designer_profiles (id),
  note text not null default '',
  file_paths text[] not null default '{}',
  links text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  feedback text,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  sender_id uuid not null references profiles (id),
  body text not null default '',
  file_path text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on messages (contract_id, created_at);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  milestone_id uuid references milestones (id) on delete set null,
  raised_by uuid not null references profiles (id),
  reason text not null,
  details text not null default '',
  evidence_paths text[] not null default '{}',
  status dispute_status not null default 'open',
  resolution dispute_resolution,
  designer_share_pct int check (designer_share_pct is null or designer_share_pct between 0 and 100),
  admin_note text,
  resolved_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  reviewer_id uuid not null references profiles (id),
  reviewee_id uuid not null references profiles (id),
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (contract_id, reviewer_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read, created_at desc);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Helpers ─────────────────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_contract_party(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from contracts
    where id = cid and (client_id = auth.uid() or designer_id = auth.uid())
  );
$$;

-- New auth user → profile row (role comes from sign-up metadata).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r user_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'designer')::user_role;
begin
  if r = 'admin' then r := 'designer'; end if; -- admins are promoted manually, never self-assigned
  insert into profiles (id, role, full_name)
  values (new.id, r, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  if r = 'designer' then
    insert into designer_profiles (id) values (new.id);
  else
    insert into client_profiles (id, plan, trial_ends_at) values (new.id, 'starter', null);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their profile but never their own role or suspension.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.suspended is distinct from old.suspended)
     and not public.is_admin() and auth.uid() is not null then
    raise exception 'not allowed';
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on profiles
  for each row execute function public.guard_profile_update();

-- Plan, score and KYC fields are written by the server only.
create or replace function public.guard_designer_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
       new.plan is distinct from old.plan
    or new.latest_score is distinct from old.latest_score
    or new.latest_band is distinct from old.latest_band
    or new.kyc_verified is distinct from old.kyc_verified) then
    raise exception 'not allowed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger designer_guard before update on designer_profiles
  for each row execute function public.guard_designer_update();

create or replace function public.guard_client_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
       new.plan is distinct from old.plan or new.trial_ends_at is distinct from old.trial_ends_at) then
    raise exception 'not allowed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger client_guard before update on client_profiles
  for each row execute function public.guard_client_update();

-- ───────────────────────── Row level security ─────────────────────────
-- Reads are opened per table below. Money and state changes (funding, release,
-- disputes, AI reviews) go through server code using the service role.
alter table profiles enable row level security;
alter table designer_profiles enable row level security;
alter table client_profiles enable row level security;
alter table portfolio_items enable row level security;
alter table ai_reviews enable row level security;
alter table roadmaps enable row level security;
alter table roadmap_tasks enable row level security;
alter table jobs enable row level security;
alter table saved_jobs enable row level security;
alter table applications enable row level security;
alter table invites enable row level security;
alter table contracts enable row level security;
alter table milestones enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table submissions enable row level security;
alter table messages enable row level security;
alter table disputes enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- profiles: anyone signed in can see names/avatars; you edit yourself.
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles update self" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin" on profiles for all to authenticated using (is_admin()) with check (is_admin());

-- designer profiles are public marketplace listings.
create policy "designers read" on designer_profiles for select using (true);
create policy "designers update self" on designer_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "clients read" on client_profiles for select to authenticated using (true);
create policy "clients update self" on client_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "portfolio read" on portfolio_items for select using (true);
create policy "portfolio write own" on portfolio_items for all to authenticated
  using (designer_id = auth.uid()) with check (designer_id = auth.uid());

-- AI reviews are private to the designer (and admins). Written by the server.
create policy "reviews read own" on ai_reviews for select to authenticated
  using (designer_id = auth.uid() or is_admin());

create policy "roadmaps read own" on roadmaps for select to authenticated
  using (designer_id = auth.uid() or is_admin());
create policy "roadmap tasks read own" on roadmap_tasks for select to authenticated
  using (exists (select 1 from roadmaps r where r.id = roadmap_id and (r.designer_id = auth.uid() or is_admin())));
create policy "roadmap tasks tick own" on roadmap_tasks for update to authenticated
  using (exists (select 1 from roadmaps r where r.id = roadmap_id and r.designer_id = auth.uid()))
  with check (exists (select 1 from roadmaps r where r.id = roadmap_id and r.designer_id = auth.uid()));

create policy "jobs read open" on jobs for select
  using (status in ('open', 'filled', 'closed') or client_id = auth.uid() or is_admin());
create policy "jobs write own" on jobs for all to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "jobs admin" on jobs for update to authenticated using (is_admin()) with check (is_admin());

create policy "saved jobs own" on saved_jobs for all to authenticated
  using (designer_id = auth.uid()) with check (designer_id = auth.uid());

create policy "applications read" on applications for select to authenticated
  using (designer_id = auth.uid()
         or exists (select 1 from jobs j where j.id = job_id and j.client_id = auth.uid())
         or is_admin());
create policy "applications create own" on applications for insert to authenticated
  with check (designer_id = auth.uid() and status = 'submitted');

create policy "invites read" on invites for select to authenticated
  using (designer_id = auth.uid() or client_id = auth.uid() or is_admin());
create policy "invites create" on invites for insert to authenticated
  with check (client_id = auth.uid());

create policy "contracts read" on contracts for select to authenticated
  using (client_id = auth.uid() or designer_id = auth.uid() or is_admin());
create policy "milestones read" on milestones for select to authenticated
  using (is_contract_party(contract_id) or is_admin());
create policy "payments read" on payments for select to authenticated
  using (client_id = auth.uid() or is_admin());
create policy "payouts read" on payouts for select to authenticated
  using (designer_id = auth.uid() or is_admin());
create policy "submissions read" on submissions for select to authenticated
  using (exists (select 1 from milestones m where m.id = milestone_id and is_contract_party(m.contract_id)) or is_admin());

create policy "messages read" on messages for select to authenticated
  using (is_contract_party(contract_id) or is_admin());
create policy "messages send" on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_contract_party(contract_id) and is_system = false);

create policy "disputes read" on disputes for select to authenticated
  using (is_contract_party(contract_id) or is_admin());

create policy "reviews read" on reviews for select using (true);

create policy "notifications own" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications mark read" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "audit admin" on audit_log for select to authenticated using (is_admin());

-- ───────────────────────── Storage ─────────────────────────
-- portfolio: public images; deliverables & evidence: private, served by signed URLs.
insert into storage.buckets (id, name, public) values
  ('portfolio', 'portfolio', true),
  ('avatars', 'avatars', true),
  ('deliverables', 'deliverables', false),
  ('job-files', 'job-files', false)
on conflict (id) do nothing;

-- Files live under "<user id>/..." so ownership is the first path segment.
create policy "own folder write" on storage.objects for insert to authenticated
  with check (bucket_id in ('portfolio', 'avatars', 'deliverables', 'job-files')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects for delete to authenticated
  using (bucket_id in ('portfolio', 'avatars', 'deliverables', 'job-files')
         and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public buckets read" on storage.objects for select
  using (bucket_id in ('portfolio', 'avatars'));
create policy "own private read" on storage.objects for select to authenticated
  using (bucket_id in ('deliverables', 'job-files') and (storage.foldername(name))[1] = auth.uid()::text);
