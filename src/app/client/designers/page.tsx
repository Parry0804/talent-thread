import Link from "next/link";
import { Search, Users } from "lucide-react";
import { completedContractCounts, loadDesigners, portfolioThumbs, requireClient } from "@/lib/client/data";
import { EMERGING_CONTRACTS } from "@/lib/client/matching";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BandBadge } from "@/components/ui/score";
import { EmergingTag } from "@/components/client/designer-mini-card";
import { CITIES, DISCIPLINES } from "@/lib/options";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Find designers" };

const AVAIL = [
  { value: "", label: "Any availability" },
  { value: "available", label: "Available now" },
  { value: "limited", label: "Limited availability" },
];
const availTone = { available: "success", limited: "warning", unavailable: "neutral" } as const;
const availLabel = { available: "Available", limited: "Limited", unavailable: "Not taking work" } as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function FindDesignersPage({ searchParams }: PageProps<"/client/designers">) {
  const { viewer, supabase } = await requireClient();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const discipline = one(sp.discipline);
  const availability = one(sp.availability);
  const city = one(sp.city);
  const minRate = Math.max(0, Number(one(sp.min)) || 0);
  const maxRate = Math.max(0, Number(one(sp.max)) || 0);

  let query = supabase.from("designer_profiles").select("id").order("latest_score", { ascending: false, nullsFirst: false }).limit(200);
  if (DISCIPLINES.includes(discipline)) query = query.contains("disciplines", [discipline]);
  if (availability === "available" || availability === "limited") query = query.eq("availability", availability);
  if (minRate) query = query.gte("hourly_rate", minRate);
  if (maxRate) query = query.lte("hourly_rate", maxRate);
  const { data: pool } = await query;
  const poolIds = (pool ?? []).map((r) => r.id as string);

  let peopleQuery = poolIds.length ? supabase.from("profiles").select("id").in("id", poolIds).eq("onboarded", true).eq("suspended", false).eq("role", "designer") : null;
  if (peopleQuery && city && CITIES.includes(city)) peopleQuery = peopleQuery.eq("city", city);
  const { data: people } = peopleQuery ? await peopleQuery : { data: [] };
  const designers = await loadDesigners((people ?? []).map((p) => p.id as string));

  const needle = q.toLowerCase();
  const order = new Map(poolIds.map((id, i) => [id, i]));
  const results = [...designers.values()]
    .filter((d) => !needle || [d.name, d.profile.headline, ...d.profile.skills, ...d.profile.disciplines].some((s) => s?.toLowerCase().includes(needle)))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .slice(0, 60);
  const ids = results.map((d) => d.id);
  const [thumbs, counts, { count: openJobs }] = await Promise.all([
    portfolioThumbs(ids),
    completedContractCounts(ids),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("client_id", viewer.id).eq("status", "open"),
  ]);
  const filtered = Boolean(q || discipline || availability || city || minRate || maxRate);

  return (
    <div>
      <PageHeader title="Find designers" sub="Browse India's freelance designers. Invite the ones you like to apply to your jobs." />

      <Card className="mb-6 p-4">
        <form className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr] xl:grid-cols-[2fr_1fr_1fr_1fr_auto_auto_auto]" method="get">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input name="q" defaultValue={q} placeholder="Name, headline or skill (e.g. packaging)" className="pl-9" aria-label="Search designers" />
          </label>
          <Select name="discipline" defaultValue={discipline} aria-label="Discipline">
            <option value="">All disciplines</option>
            {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select name="availability" defaultValue={availability} aria-label="Availability">
            {AVAIL.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </Select>
          <Select name="city" defaultValue={city} aria-label="City">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input name="min" type="number" min={0} step={100} defaultValue={minRate || ""} placeholder="Min ₹/hr" aria-label="Minimum hourly rate" className="xl:w-28" />
          <Input name="max" type="number" min={0} step={100} defaultValue={maxRate || ""} placeholder="Max ₹/hr" aria-label="Maximum hourly rate" className="xl:w-28" />
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            {filtered && <LinkButton href="/client/designers" variant="ghost">Clear</LinkButton>}
          </div>
        </form>
      </Card>

      {!results.length ? (
        <EmptyState
          icon={<Users size={28} />}
          title={filtered ? "No designers match those filters" : "No designers have joined yet"}
          body={filtered ? "Try a broader search, or remove the rate or city filter." : "Designers appear here once they finish setting up their profile. Post a job in the meantime and it'll be ready when they arrive."}
          action={filtered ? <LinkButton href="/client/designers" size="sm" variant="secondary">Clear filters</LinkButton> : <LinkButton href="/client/jobs/new" size="sm">Post a job</LinkButton>}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-500">{results.length} designer{results.length === 1 ? "" : "s"}{results.length === 60 ? " (showing the first 60, narrow your search to see more)" : ""}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((d) => {
              const p = d.profile;
              const pics = thumbs.get(d.id) ?? [];
              return (
                <Card key={d.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={d.name} src={d.avatar} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.slug ? <Link href={`/d/${p.slug}`} className="hover:underline">{d.name}</Link> : d.name}</div>
                      <div className="truncate text-sm text-ink-500">{p.headline || p.disciplines.join(", ") || "Designer"}</div>
                    </div>
                    {p.score_public && p.latest_score != null && <BandBadge score={p.latest_score} />}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((i) =>
                      pics[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={pics[i]} alt="" className="aspect-[4/3] w-full rounded-sm object-cover" loading="lazy" />
                      ) : (
                        <div key={i} className="aspect-[4/3] rounded-sm bg-paper-100" />
                      ),
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={availTone[p.availability]}>{availLabel[p.availability]}</Badge>
                    {p.hourly_rate ? <Badge>{formatINR(p.hourly_rate)}/hr</Badge> : null}
                    {d.city && <Badge>{d.city}</Badge>}
                    {(counts.get(d.id) ?? 0) < EMERGING_CONTRACTS && <EmergingTag />}
                  </div>
                  {p.skills.length > 0 && <p className="line-clamp-2 text-xs text-ink-500">{p.skills.slice(0, 6).join(" · ")}</p>}
                  <div className="mt-auto flex gap-2 pt-1">
                    {openJobs ? (
                      <LinkButton href={`/client/designers/${d.id}/invite`} size="sm">Invite to a job</LinkButton>
                    ) : (
                      <LinkButton href="/client/jobs/new" size="sm" variant="secondary" title="Post a job first to invite designers">Post a job to invite</LinkButton>
                    )}
                    {p.slug && <LinkButton href={`/d/${p.slug}`} size="sm" variant="ghost">View profile</LinkButton>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
