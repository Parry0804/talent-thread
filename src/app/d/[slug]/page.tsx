import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck, ExternalLink, ImageIcon, MapPin, Sparkles, Star } from "lucide-react";
import { getViewer, homeFor } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/env";
import { portfolioImage } from "@/lib/designer-ai/images";
import { LINK_FIELDS, hrefFor } from "@/lib/designer-ai/profile";
import { experienceLabel } from "@/lib/options";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { Logo } from "@/components/shell/logo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { BandBadge, ScoreRing } from "@/components/ui/score";
import type { Availability, PortfolioItem } from "@/lib/types";

// Public columns only: payout and KYC fields are never selected here.
const PUBLIC_COLS =
  "id, slug, headline, bio, disciplines, skills, tools, languages, years_experience, hourly_rate, availability, links, plan, latest_score, latest_band, score_public";

type PublicDesigner = {
  id: string; slug: string; headline: string; bio: string; disciplines: string[]; skills: string[]; tools: string[]; languages: string[];
  years_experience: number; hourly_rate: number | null; availability: Availability; links: Record<string, string>; plan: "free" | "pro";
  latest_score: number | null; latest_band: string | null; score_public: boolean;
};

/** Profiles are only readable when signed in, so public pages read the listing with the service client. */
const loadDesigner = cache(async (slug: string) => {
  if (!isConfigured()) return null;
  const db = createServiceClient();
  const { data: d } = await db.from("designer_profiles").select(PUBLIC_COLS).eq("slug", slug).maybeSingle();
  if (!d) return null;
  const { data: p } = await db.from("profiles").select("full_name, avatar_url, city, role, suspended, onboarded").eq("id", d.id).single();
  if (!p || p.role !== "designer" || p.suspended || !p.onboarded) return null;
  return { d: d as PublicDesigner, p: p as { full_name: string; avatar_url: string | null; city: string | null } };
});

export async function generateMetadata({ params }: PageProps<"/d/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadDesigner(slug);
  if (!found) return { title: "Designer not found" };
  const { d, p } = found;
  const title = `${p.full_name || "Designer"}${d.headline ? ` · ${d.headline}` : ""}`;
  const description = (d.bio || d.headline || `${d.disciplines.join(", ")} designer on Talent Thread`).slice(0, 160);
  return { title, description, openGraph: { title, description, images: p.avatar_url ? [p.avatar_url] : undefined } };
}

const AVAILABILITY: Record<Availability, { label: string; dot: string }> = {
  available: { label: "Available for new projects", dot: "bg-success-600" },
  limited: { label: "Limited availability", dot: "bg-marigold-500" },
  unavailable: { label: "Not taking new work", dot: "bg-ink-300" },
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= Math.round(rating) ? "fill-marigold-500 text-marigold-500" : "text-paper-300"} />
      ))}
    </span>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-ink-500">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => <span key={s} className="rounded-full border border-paper-200 bg-paper-0 px-2.5 py-1 text-sm text-ink-700">{s}</span>)}
      </div>
    </div>
  );
}

export default async function PublicDesignerPage({ params }: PageProps<"/d/[slug]">) {
  const { slug } = await params;
  const found = await loadDesigner(slug);
  if (!found) notFound();
  const { d, p } = found;
  const db = createServiceClient();
  const viewer = await getViewer();

  const [{ data: itemRows }, { data: reviewRows }] = await Promise.all([
    db.from("portfolio_items").select("*").eq("designer_id", d.id).order("sort").order("created_at"),
    db.from("reviews").select("id, rating, comment, created_at, reviewer_id").eq("reviewee_id", d.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const items = (itemRows ?? []) as PortfolioItem[];
  const reviews = reviewRows ?? [];
  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id as string))];
  const { data: reviewers } = reviewerIds.length
    ? await db.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const reviewerName = new Map((reviewers ?? []).map((r) => [r.id as string, (r.full_name as string) || "A client"]));
  const { data: companies } = reviewerIds.length
    ? await db.from("client_profiles").select("id, company_name").in("id", reviewerIds)
    : { data: [] as { id: string; company_name: string }[] };
  const company = new Map((companies ?? []).map((c) => [c.id as string, c.company_name as string]));
  const avg = reviews.length ? reviews.reduce((s, r) => s + (r.rating as number), 0) / reviews.length : null;

  const isSelf = viewer?.id === d.id;
  const invite =
    viewer?.role === "client"
      ? <LinkButton href={`/client/designers/${d.id}/invite`} size="lg">Invite to a job</LinkButton>
      : isSelf
        ? <LinkButton href="/designer/profile" variant="secondary" size="lg">Edit my profile</LinkButton>
        : viewer
          ? null
          : <LinkButton href="/signup?role=client" size="lg">Invite to a job</LinkButton>;
  const showScore = d.score_public && d.latest_score != null;
  const avail = AVAILABILITY[d.availability] ?? AVAILABILITY.available;
  const links = LINK_FIELDS.filter((l) => d.links?.[l.key]);
  const first = (p.full_name || "This designer").split(" ")[0];

  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between border-b border-paper-200 bg-paper-0 px-4 sm:px-8">
        <Logo />
        {viewer ? (
          <Link href={homeFor(viewer.role)} className="text-sm font-medium text-ink-700 hover:text-ink-900">Go to dashboard</Link>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="font-medium text-ink-700 hover:text-ink-900">Sign in</Link>
            <LinkButton href="/signup?role=client" size="sm">Hire a designer</LinkButton>
          </div>
        )}
      </header>

      {isSelf && (
        <div className="bg-violet-50 px-4 py-2 text-center text-sm text-ink-700">
          This is how clients see your profile.{" "}
          <Link href="/designer/profile" className="font-medium text-violet-600 hover:underline">Edit profile</Link>
          {!d.score_public && d.latest_score != null && <> · Your AI score is hidden. You can show it from your review report.</>}
        </div>
      )}

      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8">
        {/* Hero */}
        <section className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 gap-5">
            <Avatar name={p.full_name} src={p.avatar_url} size={96} />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-4xl font-semibold tracking-tight">
                {p.full_name || "Designer"}
                {d.plan === "pro" && <Badge tone="highlight"><BadgeCheck size={12} /> Pro</Badge>}
              </h1>
              {d.headline && <p className="mt-1 text-lg text-ink-600">{d.headline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-600">
                {p.city && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {p.city}</span>}
                <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${avail.dot}`} /> {avail.label}</span>
                <span>{experienceLabel(d.years_experience)} experience</span>
                {avg != null && <span className="inline-flex items-center gap-1.5"><Stars rating={avg} /> {avg.toFixed(1)} ({reviews.length})</span>}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {invite}
                {d.hourly_rate ? <span className="text-sm text-ink-600"><strong className="font-display text-xl font-semibold tabular text-ink-900">{formatINR(d.hourly_rate)}</strong>/hr</span> : null}
              </div>
            </div>
          </div>

          {showScore && (
            <Card className="flex shrink-0 items-center gap-4 p-5">
              <ScoreRing score={d.latest_score!} size={96} />
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold text-violet-600"><Sparkles size={12} /> AI portfolio score</p>
                <div className="mt-1"><BandBadge score={d.latest_score!} /></div>
                <p className="mt-2 max-w-[180px] text-xs text-ink-500">From Talent Thread&apos;s AI review of {first}&apos;s portfolio.</p>
              </div>
            </Card>
          )}
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Portfolio */}
          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold">Portfolio</h2>
            {items.length === 0 ? (
              <EmptyState icon={<ImageIcon size={28} />} title="No portfolio pieces yet" body={isSelf ? "Your projects will show here. Add your first piece from your Portfolio page." : `${first} hasn't added any work yet. Check back soon.`} action={isSelf ? <LinkButton href="/designer/portfolio/new">Add a piece</LinkButton> : undefined} />
            ) : (
              <div className="flex flex-col gap-8">
                {items.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-lg border border-paper-200 bg-paper-0 shadow-card">
                    {item.image_paths[0] && (
                      <a href={portfolioImage(item.image_paths[0])} target="_blank" rel="noreferrer" className="block bg-paper-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={portfolioImage(item.image_paths[0])} alt={item.title} className="max-h-[560px] w-full object-cover" />
                      </a>
                    )}
                    {item.image_paths.length > 1 && (
                      <div className="grid grid-cols-3 gap-1 bg-paper-100 p-1 sm:grid-cols-4">
                        {item.image_paths.slice(1).map((path, i) => (
                          <a key={path} href={portfolioImage(path)} target="_blank" rel="noreferrer" className="aspect-[4/3] overflow-hidden rounded-sm bg-paper-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={portfolioImage(path)} alt={`${item.title}, image ${i + 2}`} className="h-full w-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-ink-900">{item.title}</h3>
                        <Badge>{item.category}</Badge>
                      </div>
                      {item.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">{item.description}</p>}
                      {item.link && (
                        <a href={hrefFor(item.link)} target="_blank" rel="noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink-900 hover:underline">
                          See the full project <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Reviews */}
            <h2 className="mb-4 mt-12 font-display text-2xl font-semibold">Client reviews</h2>
            {reviews.length === 0 ? (
              <EmptyState title="No reviews yet" body={`Reviews from clients who hire ${first} through Talent Thread will appear here after each completed contract.`} />
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((r) => (
                  <Card key={r.id as string} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-ink-900">
                        {reviewerName.get(r.reviewer_id as string) ?? "A client"}
                        {company.get(r.reviewer_id as string) && <span className="font-normal text-ink-500"> · {company.get(r.reviewer_id as string)}</span>}
                      </div>
                      <span className="flex items-center gap-2 text-xs text-ink-500"><Stars rating={r.rating as number} /> {formatDate(r.created_at as string)}</span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm leading-relaxed text-ink-700">{r.comment as string}</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            {d.bio && (
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-ink-500">About</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{d.bio}</p>
              </div>
            )}
            <Chips title="Disciplines" items={d.disciplines} />
            <Chips title="Skills" items={d.skills} />
            <Chips title="Tools" items={d.tools} />
            <Chips title="Languages" items={d.languages} />
            {links.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-ink-500">Elsewhere</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {links.map((l) => (
                    <li key={l.key}>
                      <a href={hrefFor(d.links[l.key])} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-1 font-medium text-ink-800 hover:underline">
                        {l.label} <ExternalLink size={12} className="text-ink-400" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {invite && !isSelf && (
              <Card className="p-5">
                <p className="text-sm text-ink-700">Like {first}&apos;s work? Payments are held safely in escrow and released milestone by milestone.</p>
                <div className="mt-3">{invite}</div>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
