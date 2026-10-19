import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { BandBadge } from "@/components/ui/score";
import { formatINR } from "@/lib/money";
import type { RankedDesigner } from "@/lib/client/matching";
import type { ReactNode } from "react";

export function EmergingTag() {
  return <Badge tone="highlight">Emerging talent</Badge>;
}

/** Compact ranked-designer card used on the dashboard and the "Published" page. */
export function DesignerMiniCard({ d, inviteJobId, action }: { d: RankedDesigner; inviteJobId?: string; action?: ReactNode }) {
  const p = d.profile;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-paper-200 bg-paper-0 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={d.name} src={d.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{p.slug ? <Link href={`/d/${p.slug}`} className="hover:underline">{d.name}</Link> : d.name}</div>
          <div className="truncate text-xs text-ink-500">{p.headline || p.disciplines.join(", ") || "Designer"}</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-600 tabular">
          <Sparkles size={11} aria-hidden /> {d.fit}%
        </span>
      </div>
      {d.thumbs.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {d.thumbs.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="aspect-[4/3] w-full rounded-sm object-cover" />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {d.completed < 3 && <EmergingTag />}
        {p.score_public && p.latest_score != null && <BandBadge score={p.latest_score} />}
        {p.hourly_rate ? <Badge>{formatINR(p.hourly_rate)}/hr</Badge> : null}
        {d.city && <Badge>{d.city}</Badge>}
      </div>
      {d.reasons.length > 0 && <p className="text-xs text-ink-500">{d.reasons.slice(0, 3).join(" · ")}</p>}
      <div className="mt-auto flex gap-2">
        {action ?? (inviteJobId ? <LinkButton href={`/client/designers/${d.id}/invite?job=${inviteJobId}`} size="sm" variant="secondary">Invite to apply</LinkButton> : null)}
        {p.slug && <LinkButton href={`/d/${p.slug}`} size="sm" variant="ghost">View profile</LinkButton>}
      </div>
    </div>
  );
}
