import Link from "next/link";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FilterTabs, EmptyRow, Pager, Table, Td } from "@/components/admin/table";
import { ConfirmForm } from "@/components/contracts/confirm-form";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { makeAdmin, setSuspended } from "./actions";

export const metadata = { title: "Users" };
const PAGE = 50;

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireRole("admin");
  const sp = await searchParams;
  const role = typeof sp.role === "string" && ["designer", "client", "admin", "suspended"].includes(sp.role) ? sp.role : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = createServiceClient();
  let query = db.from("profiles").select("*").order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE);
  if (role === "suspended") query = query.eq("suspended", true);
  else if (role !== "all") query = query.eq("role", role);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_,()]/g, " ")}%`);
  const { data } = await query;
  const rows = (data ?? []) as Profile[];
  const list = rows.slice(0, PAGE);
  const ids = list.map((r) => r.id);
  const [{ data: dps }, { data: cps }] = await Promise.all([
    ids.length ? db.from("designer_profiles").select("id, latest_score, plan").in("id", ids) : { data: [] },
    ids.length ? db.from("client_profiles").select("id, company_name, plan").in("id", ids) : { data: [] },
  ]);
  const dmap = new Map((dps ?? []).map((d) => [d.id, d]));
  const cmap = new Map((cps ?? []).map((c) => [c.id, c]));

  const qs = (r: string) => `/admin/users?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" sub="Find people, suspend accounts that break the rules, and add admins. Every change is written to the audit log." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          active={role}
          items={[
            { key: "all", label: "Everyone", href: qs("all") },
            { key: "designer", label: "Designers", href: qs("designer") },
            { key: "client", label: "Clients", href: qs("client") },
            { key: "admin", label: "Admins", href: qs("admin") },
            { key: "suspended", label: "Suspended", href: qs("suspended") },
          ]}
        />
        <form className="flex items-center gap-2" action="/admin/users">
          <input type="hidden" name="role" value={role} />
          <Input name="q" defaultValue={q} placeholder="Search by name" className="w-56" aria-label="Search by name" />
          <Button type="submit" variant="secondary"><Search size={14} /> Search</Button>
        </form>
      </div>

      <Table head={["Name", "Role", "Details", "Joined", "Status", "Actions"]}>
        {list.length === 0 ? (
          <EmptyRow cols={6}>{q ? `No one matches “${q}”.` : "No users here yet. People appear as soon as they sign up."}</EmptyRow>
        ) : (
          list.map((u) => {
            const d = dmap.get(u.id);
            const c = cmap.get(u.id);
            return (
              <tr key={u.id}>
                <Td>
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5 font-medium hover:underline">
                    <Avatar name={u.full_name} src={u.avatar_url} size={28} />
                    {u.full_name || "Unnamed"}
                  </Link>
                </Td>
                <Td><Badge tone={u.role === "admin" ? "brand" : "neutral"}>{u.role}</Badge></Td>
                <Td className="text-ink-500">
                  {u.role === "designer" && d ? `Score ${d.latest_score ?? "–"} · ${d.plan}` : u.role === "client" && c ? `${c.company_name || "No company"} · ${c.plan}` : "—"}
                  {u.city ? ` · ${u.city}` : ""}
                </Td>
                <Td className="whitespace-nowrap text-ink-500">{formatDate(u.created_at)}</Td>
                <Td>
                  {u.suspended ? <Badge tone="danger">Suspended</Badge> : u.onboarded || u.role === "admin" ? <Badge tone="success">Active</Badge> : <Badge>Onboarding</Badge>}
                </Td>
                <Td>
                  {u.id === admin.id ? (
                    <span className="text-xs text-ink-400">This is you</span>
                  ) : (
                    <div className="flex min-w-56 flex-col gap-2">
                      <ConfirmForm
                        action={setSuspended}
                        fields={{ user_id: u.id, suspend: u.suspended ? "0" : "1" }}
                        size="sm"
                        variant="secondary"
                        confirmVariant={u.suspended ? "primary" : "danger"}
                        label={u.suspended ? "Unsuspend" : "Suspend"}
                        confirmLabel={u.suspended ? "Yes, unsuspend" : "Yes, suspend"}
                        message={u.suspended ? `Let ${u.full_name || "this user"} use Talent Thread again?` : `Suspend ${u.full_name || "this user"}? They'll be signed out of every page until you unsuspend them.`}
                      >
                        {!u.suspended && <Input name="reason" placeholder="Reason (for the audit log)" />}
                      </ConfirmForm>
                      {u.role !== "admin" && (
                        <ConfirmForm
                          action={makeAdmin}
                          fields={{ user_id: u.id }}
                          size="sm"
                          variant="ghost"
                          label="Make admin"
                          confirmLabel="Yes, make admin"
                          message={`Give ${u.full_name || "this user"} full admin access, including money and disputes?`}
                        />
                      )}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })
        )}
      </Table>
      <Pager page={page} hasNext={rows.length > PAGE} base={qs(role)} />
    </>
  );
}
