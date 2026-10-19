import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge, MilestoneBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { SplitInput } from "@/components/admin/split-input";
import { ContractChat, type ChatPerson } from "@/components/contracts/contract-chat";
import { people, signedFiles, displayName } from "@/components/contracts/data";
import { formatDateTime } from "@/components/contracts/util";
import { SubmissionView, type SubmissionRow } from "@/components/contracts/submission-view";
import { formatINR, designerPayout, MAX_REVISIONS } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Contract, Dispute, Message, Milestone } from "@/lib/types";
import { resolveDisputeAction } from "./actions";

export const metadata = { title: "Dispute" };

const choice =
  "flex cursor-pointer flex-col gap-0.5 rounded-md border border-paper-200 bg-paper-0 px-4 py-3 text-sm hover:border-ink-300 has-[:checked]:border-ink-900 has-[:checked]:ring-1 has-[:checked]:ring-ink-900";

export default async function AdminDisputePage({ params }: PageProps<"/admin/disputes/[id]">) {
  await requireRole("admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createServiceClient();
  const { data: d } = await db.from("disputes").select("*").eq("id", id).maybeSingle<Dispute>();
  if (!d) notFound();
  const [{ data: c }, { data: m }] = await Promise.all([
    db.from("contracts").select("*").eq("id", d.contract_id).single<Contract>(),
    d.milestone_id ? db.from("milestones").select("*").eq("id", d.milestone_id).single<Milestone>() : Promise.resolve({ data: null }),
  ]);
  if (!c) notFound();

  const [{ data: subs }, { data: msgs }, { data: pay }] = await Promise.all([
    m ? db.from("submissions").select("*").eq("milestone_id", m.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    db.from("messages").select("*").eq("contract_id", c.id).order("created_at").limit(500),
    m ? db.from("payments").select("*").eq("milestone_id", m.id).eq("status", "paid").maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const submissions = (subs ?? []) as SubmissionRow[];
  const messages = (msgs ?? []) as Message[];
  const files = await signedFiles([...d.evidence_paths, ...submissions.flatMap((s) => s.file_paths)]);
  const who = await people([c.client_id, c.designer_id, d.raised_by, d.resolved_by, ...messages.map((x) => x.sender_id)]);
  const chatPeople: Record<string, ChatPerson> = Object.fromEntries([...who.values()].map((p) => [p.id, { name: p.name, avatar: p.avatar }]));
  const raisedByClient = d.raised_by === c.client_id;
  const amount = m?.amount ?? 0;
  const fullPayout = designerPayout(amount, c.repeat_hire);

  const side = (pid: string, label: string) => {
    const p = who.get(pid);
    const raised = d.raised_by === pid;
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Avatar name={p?.name} src={p?.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-ink-500">{label}</div>
            <Link href={`/admin/users/${pid}`} className="font-semibold hover:underline">{displayName(p)}</Link>
          </div>
          {raised && <Badge tone="danger">Raised the dispute</Badge>}
        </div>
        <div className="mt-4 text-sm">
          {raised ? (
            <>
              <p className="font-medium text-ink-900">{d.reason}</p>
              <p className="mt-2 whitespace-pre-wrap text-ink-700">{d.details || "No details given."}</p>
              {d.evidence_paths.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {d.evidence_paths.map((path) => {
                    const f = files.get(path);
                    return (
                      <li key={path}>
                        <a href={f?.url ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-paper-200 px-3 py-1 text-xs font-medium hover:border-ink-300">
                          <Paperclip size={12} /> {f?.name ?? path}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-ink-500">
              Hasn&apos;t filed a written statement. Read their messages in the chat below, or message them before deciding.
            </p>
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      <Link href="/admin/disputes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={14} /> All disputes
      </Link>
      <PageHeader
        eyebrow={`Dispute · ${c.code}`}
        title={c.title}
        sub={`Opened ${formatDateTime(d.created_at)} by the ${raisedByClient ? "client" : "designer"}.`}
        action={d.status === "open" ? <Badge tone="danger">Open</Badge> : <Badge tone="success">Resolved</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            {side(c.client_id, "Client")}
            {side(c.designer_id, "Designer")}
          </div>

          {m && (
            <Card>
              <CardHeader
                title={`Milestone ${m.seq}: ${m.title}`}
                sub={`${formatINR(m.amount)} · funded ${formatDate(m.funded_at)} · ${m.revision_count} of ${MAX_REVISIONS} revision rounds used`}
                action={<MilestoneBadge status={m.status} />}
              />
              <CardBody className="flex flex-col gap-3">
                {m.description && <p className="whitespace-pre-wrap text-sm text-ink-700">{m.description}</p>}
                {c.scope && (
                  <details className="rounded-md border border-paper-200">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium">Contract scope</summary>
                    <p className="whitespace-pre-wrap border-t border-paper-200 p-4 text-sm text-ink-700">{c.scope}</p>
                  </details>
                )}
                {submissions.length === 0 ? (
                  <p className="text-sm text-ink-500">The designer hasn&apos;t submitted any work for this milestone.</p>
                ) : (
                  submissions.map((s, i) => <SubmissionView key={s.id} s={s} files={files} title={i === 0 ? "Latest submission" : "Earlier submission"} />)
                )}
                <p className="text-xs text-ink-500">
                  Client paid {pay ? formatINR(Math.round(pay.total_paise / 100)) : "—"} for this milestone
                  {pay?.razorpay_payment_id ? ` (Razorpay ${pay.razorpay_payment_id})` : ""}.
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Decision" sub="This moves money and can't be undone. Both parties see your note in their chat." />
            <CardBody>
              {d.status === "resolved" ? (
                <div className="flex flex-col gap-2 text-sm">
                  <p>
                    <span className="font-semibold capitalize">{d.resolution}</span>
                    {d.resolution === "split" && ` · ${d.designer_share_pct}% to the designer`} by {who.get(d.resolved_by ?? "")?.name ?? "an admin"} on {formatDateTime(d.resolved_at)}.
                  </p>
                  {d.admin_note && <p className="whitespace-pre-wrap rounded-md bg-paper-50 p-3 text-ink-700">{d.admin_note}</p>}
                </div>
              ) : !m ? (
                <p className="text-sm text-ink-500">This dispute isn&apos;t linked to a milestone, so there&apos;s no money to move.</p>
              ) : (
                <ActionForm action={resolveDisputeAction}>
                  <input type="hidden" name="dispute_id" value={d.id} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className={choice}>
                      <input type="radio" name="resolution" value="release" className="sr-only" required />
                      <span className="font-semibold">Release to designer</span>
                      <span className="text-xs text-ink-500">{formatINR(amount)} released · designer nets {formatINR(fullPayout.net)}</span>
                    </label>
                    <label className={choice}>
                      <input type="radio" name="resolution" value="refund" className="sr-only" />
                      <span className="font-semibold">Refund the client</span>
                      <span className="text-xs text-ink-500">{formatINR(amount)} refunded through Razorpay</span>
                    </label>
                    <label className={choice}>
                      <input type="radio" name="resolution" value="split" className="sr-only" />
                      <span className="font-semibold">Split</span>
                      <span className="text-xs text-ink-500">Part to the designer, the rest refunded</span>
                    </label>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-700">Designer&apos;s share (used for a split)</span>
                    <SplitInput amount={amount} />
                  </div>
                  <Field label="Note to both parties" hint="Explain what you looked at and why you decided this way.">
                    <Textarea name="note" rows={4} required minLength={10} />
                  </Field>
                  <p className="text-xs text-ink-500">Platform fees and GST aren&apos;t refunded. Refunds need Razorpay keys to be set.</p>
                  <SubmitButton pending="Resolving…" className="self-start">Resolve dispute and move the money</SubmitButton>
                </ActionForm>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="min-w-0">
          <Card className="flex h-[640px] flex-col overflow-hidden xl:sticky xl:top-24">
            <div className="flex items-center justify-between border-b border-paper-200 px-5 py-3">
              <h2 className="text-sm font-semibold">Chat history (read-only)</h2>
              <Link href={`/contracts/${c.id}`} className="text-xs font-medium text-ink-500 hover:text-ink-900">Open contract</Link>
            </div>
            <ContractChat className="flex-1" contractId={c.id} viewerId="" initialMessages={messages} people={chatPeople} readOnly />
          </Card>
        </aside>
      </div>
    </>
  );
}
