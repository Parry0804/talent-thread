import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BandBadge } from "@/components/ui/score";
import { EmptyRow, FilterTabs, Table, Td } from "@/components/admin/table";
import { people } from "@/components/contracts/data";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "AI quality" };

type Row = {
  id: string; designer_id: string; status: string; overall: number | null; band: string | null; model: string | null;
  rubric_version: string; created_at: string; error: string | null; flags: string[] | null; confidence: string | null;
};

export default async function AdminAiPage({ searchParams }: PageProps<"/admin/ai">) {
  await requireRole("admin");
  const sp = await searchParams;
  const f = sp.f === "flagged" || sp.f === "low" || sp.f === "failed" ? sp.f : "all";
  const db = createServiceClient();
  let query = db
    .from("ai_reviews")
    .select("id, designer_id, status, overall, band, model, rubric_version, created_at, error, flags:report->flags, confidence:report->>confidence")
    .order("created_at", { ascending: false })
    .limit(300);
  if (f === "failed") query = query.eq("status", "failed");
  const { data } = await query;
  let rows = (data ?? []) as Row[];
  if (f === "flagged") rows = rows.filter((r) => Array.isArray(r.flags) && r.flags.length > 0);
  if (f === "low") rows = rows.filter((r) => r.confidence === "low");
  rows = rows.slice(0, 100);
  const who = await people(rows.map((r) => r.designer_id));

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<span className="flex items-center gap-2"><Sparkles size={24} className="text-violet-500" /> AI quality</span>}
        sub="Spot-check AI portfolio reviews. Flags never change a score; they mark work a human should look at (possible copying, AI-generated work, discipline mismatch)."
      />
      <div className="mb-5">
        <FilterTabs
          active={f}
          items={[
            { key: "all", label: "Recent", href: "/admin/ai" },
            { key: "flagged", label: "Flagged", href: "/admin/ai?f=flagged" },
            { key: "low", label: "Low confidence", href: "/admin/ai?f=low" },
            { key: "failed", label: "Failed", href: "/admin/ai?f=failed" },
          ]}
        />
      </div>
      <Table head={["Designer", "Score", "Band", "Confidence", "Flags", "Model", "Rubric", "When", ""]}>
        {rows.length === 0 ? (
          <EmptyRow cols={9}>{f === "all" ? "No AI reviews yet. They appear here when designers run their first portfolio review." : "Nothing matches this filter."}</EmptyRow>
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <Td><Link href={`/admin/users/${r.designer_id}`} className="font-medium hover:underline">{who.get(r.designer_id)?.name ?? "Designer"}</Link></Td>
              <Td className="font-semibold tabular">{r.overall ?? "—"}</Td>
              <Td>{r.overall != null ? <BandBadge score={r.overall} /> : <Badge tone={r.status === "failed" ? "danger" : "neutral"}>{r.status}</Badge>}</Td>
              <Td>{r.confidence ? <Badge tone={r.confidence === "low" ? "warning" : r.confidence === "high" ? "success" : "neutral"}>{r.confidence}</Badge> : "—"}</Td>
              <Td className="max-w-64">
                {Array.isArray(r.flags) && r.flags.length ? <span className="text-xs text-danger-600">{r.flags.join(" · ")}</span> : <span className="text-ink-400">—</span>}
              </Td>
              <Td className="font-mono text-xs text-ink-500">{r.model ?? "—"}</Td>
              <Td className="font-mono text-xs text-ink-500">{r.rubric_version}</Td>
              <Td className="whitespace-nowrap text-ink-500">{timeAgo(r.created_at)}</Td>
              <Td><Link href={`/admin/ai/${r.id}`} className="text-sm font-medium hover:underline">Report</Link></Td>
            </tr>
          ))
        )}
      </Table>
    </>
  );
}
