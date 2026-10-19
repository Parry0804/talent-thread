import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BandBadge, ScoreBar, ScoreRing } from "@/components/ui/score";
import { people } from "@/components/contracts/data";
import { formatDateTime } from "@/components/contracts/util";
import { DIMENSIONS } from "@/lib/ai/rubric";
import type { AiReview } from "@/lib/types";

export const metadata = { title: "AI review report" };

export default async function AdminAiReportPage({ params }: PageProps<"/admin/ai/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createServiceClient();
  const { data: r } = await db.from("ai_reviews").select("*").eq("id", id).maybeSingle<AiReview>();
  if (!r) notFound();
  const who = await people([r.designer_id]);
  const report = r.report;

  return (
    <>
      <Link href="/admin/ai" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={14} /> AI quality
      </Link>
      <PageHeader
        eyebrow="Admin · AI review"
        title={who.get(r.designer_id)?.name ?? "Designer"}
        sub={`${formatDateTime(r.created_at)} · ${r.model ?? "model unknown"} · rubric ${r.rubric_version}${report ? ` · ${report.samples} sample${report.samples === 1 ? "" : "s"}` : ""}`}
        action={<Link href={`/admin/users/${r.designer_id}`} className="text-sm font-medium hover:underline">Open user</Link>}
      />

      {!report ? (
        <Card className="p-6 text-sm text-ink-600">
          Status: <Badge>{r.status}</Badge>
          {r.error && <p className="mt-3 rounded-md bg-danger-50 p-3 text-danger-600">{r.error}</p>}
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <Card className="flex flex-col items-center gap-3 p-6">
              <ScoreRing score={r.overall ?? 0} size={150} />
              {r.overall != null && <BandBadge score={r.overall} />}
              <div className="text-center text-xs text-ink-500">
                Track: {report.track} · confidence {report.confidence}
              </div>
            </Card>
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-violet-500" /> Overview</span>} sub={report.segments.join(" · ")} />
              <CardBody className="flex flex-col gap-4 text-sm text-ink-700">
                <p>{report.overview}</p>
                <p className="text-ink-500">{report.justification}</p>
                {report.flags.length > 0 && (
                  <div className="rounded-md border border-danger-600/30 bg-danger-50 p-3 text-danger-600">
                    <p className="flex items-center gap-1.5 font-semibold"><Flag size={14} /> Flags for a human</p>
                    <ul className="mt-1 list-disc pl-5">{report.flags.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
                {report.limitations.length > 0 && (
                  <div>
                    <p className="font-semibold text-ink-900">Limitations</p>
                    <ul className="mt-1 list-disc pl-5 text-ink-600">{report.limitations.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {DIMENSIONS.map((d) => {
              const dim = report.dimensions[d.key];
              if (!dim) return null;
              return (
                <Card key={d.key} className="p-5">
                  <ScoreBar label={d.name} weight={d.weight} score={dim.score} />
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {d.checks.map((c) => (
                      <Badge key={c.key} tone="neutral">{c.name}: {dim.checks[c.key] ?? "–"}/4</Badge>
                    ))}
                    <Badge tone={dim.confidence === "low" ? "warning" : "neutral"}>confidence {dim.confidence}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-success-600">{dim.working}</p>
                  <ul className="mt-2 flex flex-col gap-2 text-sm">
                    {dim.points.map((p, i) => (
                      <li key={i} className="rounded-md bg-paper-50 p-3">
                        {p.image != null && <span className="mr-1 font-mono text-xs text-ink-400">#{p.image}</span>}
                        <span className="text-ink-800">{p.see}</span>
                        <span className="block text-xs text-ink-500">Why: {p.why}</span>
                        <span className="block text-xs text-ink-700">Fix: {p.fix}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Raw report JSON" sub="Exactly what is stored in ai_reviews.report." />
            <CardBody>
              <pre className="max-h-[600px] overflow-auto rounded-md bg-ink-900 p-4 font-mono text-xs leading-relaxed text-paper-100">
                {JSON.stringify(report, null, 2)}
              </pre>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
