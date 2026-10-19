import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge, ContractBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { BandBadge } from "@/components/ui/score";
import { Input } from "@/components/ui/form";
import { EmptyRow, Table, Td } from "@/components/admin/table";
import { ConfirmForm } from "@/components/contracts/confirm-form";
import { people } from "@/components/contracts/data";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Contract, Profile } from "@/lib/types";
import { makeAdmin, setSuspended } from "../actions";

export const metadata = { title: "User" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-paper-100 py-2 text-sm last:border-0">
      <span className="text-ink-500">{k}</span>
      <span className="text-right text-ink-900">{v || "—"}</span>
    </div>
  );
}

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const admin = await requireRole("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createServiceClient();
  const { data: u } = await db.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!u) notFound();

  const [{ data: authUser }, { data: dp }, { data: bank }, { data: cp }, { data: cs }, { data: revs }, { data: ais }] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from("designer_profiles").select("*").eq("id", id).maybeSingle(),
    db.from("designer_payout").select("payout_upi, pan_last4").eq("id", id).maybeSingle(),
    db.from("client_profiles").select("*").eq("id", id).maybeSingle(),
    db.from("contracts").select("*").or(`client_id.eq.${id},designer_id.eq.${id}`).order("created_at", { ascending: false }).limit(50),
    db.from("reviews").select("*").or(`reviewer_id.eq.${id},reviewee_id.eq.${id}`).order("created_at", { ascending: false }).limit(50),
    db
      .from("ai_reviews")
      .select("id, status, overall, band, model, rubric_version, created_at, flags:report->flags, confidence:report->>confidence")
      .eq("designer_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const contracts = (cs ?? []) as Contract[];
  const reviews = (revs ?? []) as { id: string; reviewer_id: string; reviewee_id: string; rating: number; comment: string; created_at: string }[];
  const who = await people([...contracts.flatMap((c) => [c.client_id, c.designer_id]), ...reviews.flatMap((r) => [r.reviewer_id, r.reviewee_id])]);
  const received = reviews.filter((r) => r.reviewee_id === id);
  const avg = received.length ? (received.reduce((a, r) => a + r.rating, 0) / received.length).toFixed(1) : null;

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={14} /> All users
      </Link>
      <PageHeader
        eyebrow="Admin · user"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={u.full_name} src={u.avatar_url} size={44} />
            {u.full_name || "Unnamed user"}
          </span>
        }
        sub={`${u.role[0].toUpperCase()}${u.role.slice(1)} · joined ${formatDate(u.created_at)}${avg ? ` · rated ${avg}★ from ${received.length} review${received.length === 1 ? "" : "s"}` : ""}`}
        action={u.suspended ? <Badge tone="danger">Suspended</Badge> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Profile" />
            <CardBody className="pt-3">
              <Row k="Email" v={authUser?.user?.email} />
              <Row k="Phone" v={u.phone} />
              <Row k="City" v={u.city} />
              <Row k="Onboarded" v={u.onboarded ? "Yes" : "No"} />
              {dp && (
                <>
                  <Row k="Headline" v={dp.headline} />
                  <Row k="Plan" v={dp.plan} />
                  <Row k="Latest AI score" v={dp.latest_score != null ? `${dp.latest_score} (${dp.latest_band ?? ""})` : null} />
                  <Row k="Hourly rate" v={dp.hourly_rate ? formatINR(dp.hourly_rate) : null} />
                  <Row k="Payout UPI" v={bank?.payout_upi} />
                  <Row k="PAN (last 4)" v={bank?.pan_last4} />
                  <Row k="KYC verified" v={dp.kyc_verified ? "Yes" : "No"} />
                  {dp.slug && <Row k="Public profile" v={<Link className="underline" href={`/d/${dp.slug}`}>/d/{dp.slug}</Link>} />}
                </>
              )}
              {cp && (
                <>
                  <Row k="Company" v={cp.company_name} />
                  <Row k="Industry" v={cp.industry} />
                  <Row k="GSTIN" v={cp.gstin} />
                  <Row k="Plan" v={cp.plan} />
                </>
              )}
            </CardBody>
          </Card>
          {u.id !== admin.id && (
            <Card>
              <CardHeader title="Account actions" sub="Each action is recorded in the audit log." />
              <CardBody className="flex flex-col gap-3">
                <ConfirmForm
                  action={setSuspended}
                  fields={{ user_id: u.id, suspend: u.suspended ? "0" : "1" }}
                  variant="secondary"
                  confirmVariant={u.suspended ? "primary" : "danger"}
                  label={u.suspended ? "Unsuspend account" : "Suspend account"}
                  confirmLabel={u.suspended ? "Yes, unsuspend" : "Yes, suspend"}
                  message={u.suspended ? "They'll be able to sign in and use Talent Thread again." : "They'll be shown the suspended page everywhere until you undo this."}
                >
                  {!u.suspended && <Input name="reason" placeholder="Reason (for the audit log)" />}
                </ConfirmForm>
                {u.role !== "admin" && (
                  <ConfirmForm
                    action={makeAdmin}
                    fields={{ user_id: u.id }}
                    variant="ghost"
                    label="Make admin"
                    confirmLabel="Yes, make admin"
                    message="Admins can see every contract, move money and resolve disputes."
                  />
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section>
            <h2 className="mb-3 font-semibold">Contracts</h2>
            <Table head={["Contract", "Other party", "Value", "Status", "Started"]}>
              {contracts.length === 0 ? (
                <EmptyRow cols={5}>No contracts yet.</EmptyRow>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                      <div className="font-mono text-xs text-ink-400">{c.code}</div>
                    </Td>
                    <Td className="text-ink-600">{who.get(c.client_id === id ? c.designer_id : c.client_id)?.name}</Td>
                    <Td className="tabular">{formatINR(c.total_amount)}</Td>
                    <Td><ContractBadge status={c.status} /></Td>
                    <Td className="whitespace-nowrap text-ink-500">{formatDate(c.created_at)}</Td>
                  </tr>
                ))
              )}
            </Table>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="rounded-lg border border-dashed border-paper-300 bg-paper-0 px-4 py-6 text-center text-sm text-ink-500">No reviews given or received yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {reviews.map((r) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-medium">{who.get(r.reviewer_id)?.name}</span> → {who.get(r.reviewee_id)?.name}
                      </span>
                      <span className="flex items-center gap-1 text-marigold-600"><Star size={13} fill="currentColor" /> {r.rating}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-ink-600">{r.comment}</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {u.role === "designer" && (
            <section>
              <h2 className="mb-3 font-semibold">AI reviews</h2>
              <Table head={["Date", "Score", "Confidence", "Flags", "Model", ""]}>
                {(ais ?? []).length === 0 ? (
                  <EmptyRow cols={6}>This designer hasn&apos;t run an AI review yet.</EmptyRow>
                ) : (
                  (ais ?? []).map((a) => (
                    <tr key={a.id}>
                      <Td className="whitespace-nowrap text-ink-500">{formatDate(a.created_at)}</Td>
                      <Td>{a.overall != null ? <span className="flex items-center gap-2 tabular">{a.overall}<BandBadge score={a.overall} /></span> : <Badge>{a.status}</Badge>}</Td>
                      <Td>{(a.confidence as string) ?? "—"}</Td>
                      <Td>{Array.isArray(a.flags) && a.flags.length ? <Badge tone="danger">{a.flags.length}</Badge> : "—"}</Td>
                      <Td className="font-mono text-xs text-ink-500">{a.model ?? "—"}</Td>
                      <Td><Link href={`/admin/ai/${a.id}`} className="text-sm font-medium hover:underline">View</Link></Td>
                    </tr>
                  ))
                )}
              </Table>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
