import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { EmptyRow, Pager, Table, Td } from "@/components/admin/table";
import { people } from "@/components/contracts/data";
import { formatDateTime } from "@/components/contracts/util";

export const metadata = { title: "Audit log" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createServiceClient();
  const { data } = await db
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE);
  const rows = (data ?? []) as { id: number; actor_id: string | null; action: string; entity: string; entity_id: string | null; meta: Record<string, unknown>; created_at: string }[];
  const list = rows.slice(0, PAGE);
  const who = await people(list.map((r) => r.actor_id));

  return (
    <>
      <PageHeader eyebrow="Admin" title="Audit log" sub="Every money movement and admin action, newest first. Entries can't be edited." />
      <Table head={["When", "Who", "Action", "Entity", "Details"]}>
        {list.length === 0 ? (
          <EmptyRow cols={5}>Nothing logged yet. Offers, payments, releases, disputes and admin actions are recorded here.</EmptyRow>
        ) : (
          list.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-ink-500">{formatDateTime(r.created_at)}</Td>
              <Td>{r.actor_id ? (who.get(r.actor_id)?.name ?? r.actor_id.slice(0, 8)) : <span className="text-ink-400">System</span>}</Td>
              <Td className="font-mono text-xs">{r.action}</Td>
              <Td className="font-mono text-xs text-ink-500">{r.entity}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</Td>
              <Td className="max-w-md">
                {Object.keys(r.meta ?? {}).length ? (
                  <code className="block truncate font-mono text-xs text-ink-600" title={JSON.stringify(r.meta)}>{JSON.stringify(r.meta)}</code>
                ) : <span className="text-ink-400">—</span>}
              </Td>
            </tr>
          ))
        )}
      </Table>
      <Pager page={page} hasNext={rows.length > PAGE} base="/admin/audit" />
    </>
  );
}
