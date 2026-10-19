import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { JobBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { EmptyRow, FilterTabs, Pager, Table, Td } from "@/components/admin/table";
import { ConfirmForm } from "@/components/contracts/confirm-form";
import { people, displayName } from "@/components/contracts/data";
import { formatBudget } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Job } from "@/lib/types";
import { closeJob } from "./actions";

export const metadata = { title: "Jobs" };
const PAGE = 50;

export default async function AdminJobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  await requireRole("admin");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["open", "draft", "filled", "closed"].includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createServiceClient();
  let query = db.from("jobs").select("*").order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE);
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  const rows = (data ?? []) as Job[];
  const list = rows.slice(0, PAGE);
  const ids = list.map((j) => j.id);
  const { data: apps } = ids.length ? await db.from("applications").select("job_id").in("job_id", ids) : { data: [] };
  const appCount = new Map<string, number>();
  for (const a of apps ?? []) appCount.set(a.job_id, (appCount.get(a.job_id) ?? 0) + 1);
  const who = await people(list.map((j) => j.client_id));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Jobs" sub="Every job posted. Close anything that breaks the rules (spam, unpaid “tests”, off-platform payment requests)." />
      <div className="mb-5">
        <FilterTabs
          active={status}
          items={["all", "open", "draft", "filled", "closed"].map((s) => ({ key: s, label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1), href: `/admin/jobs?status=${s}` }))}
        />
      </div>
      <Table head={["Job", "Client", "Budget", "Applicants", "Status", "Posted", "Moderate"]}>
        {list.length === 0 ? (
          <EmptyRow cols={7}>No jobs here yet. Jobs appear as soon as clients post them.</EmptyRow>
        ) : (
          list.map((j) => (
            <tr key={j.id}>
              <Td>
                <div className="font-medium">{j.title}</div>
                <div className="text-xs text-ink-500">{j.category}{j.skills.length ? ` · ${j.skills.slice(0, 3).join(", ")}` : ""}</div>
              </Td>
              <Td className="text-ink-600">{displayName(who.get(j.client_id))}</Td>
              <Td className="whitespace-nowrap tabular">{formatBudget(j.budget_min, j.budget_max, j.budget_type)}</Td>
              <Td className="tabular">{appCount.get(j.id) ?? 0}</Td>
              <Td><JobBadge status={j.status} /></Td>
              <Td className="whitespace-nowrap text-ink-500">{formatDate(j.published_at ?? j.created_at)}</Td>
              <Td>
                {j.status !== "closed" ? (
                  <ConfirmForm
                    action={closeJob}
                    fields={{ job_id: j.id }}
                    size="sm"
                    variant="secondary"
                    confirmVariant="danger"
                    label="Close / hide"
                    confirmLabel="Close this job"
                    message="Designers won't see it any more. The client is told why."
                    className="min-w-56"
                  >
                    <Input name="reason" required placeholder="Reason, shown to the client" />
                  </ConfirmForm>
                ) : (
                  <span className="text-xs text-ink-400">Closed</span>
                )}
              </Td>
            </tr>
          ))
        )}
      </Table>
      <Pager page={page} hasNext={rows.length > PAGE} base={`/admin/jobs?status=${status}`} />
    </>
  );
}
