import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Star } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, EmptyState, Stat } from "@/components/ui/card";
import { ContractBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea, FormNotice } from "@/components/ui/form";
import { RatingInput } from "@/components/contracts/rating-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { LinkButton } from "@/components/ui/button";
import { ConfirmForm } from "@/components/contracts/confirm-form";
import { ContractChat, type ChatPerson } from "@/components/contracts/contract-chat";
import { contractAccess, displayName, people, signedFiles } from "@/components/contracts/data";
import { contractFigures } from "@/components/contracts/util";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Message, Milestone } from "@/lib/types";
import { MilestoneCard, type PaymentRow, type PayoutRow } from "./milestone";
import type { SubmissionRow } from "@/components/contracts/submission-view";
import { acceptOfferAction, declineOfferAction, leaveReviewAction } from "./actions";
import { markThreadRead, sendMessage } from "../../messages/actions";

export const metadata = { title: "Contract" };

export default async function ContractPage({ params, searchParams }: PageProps<"/contracts/[id]">) {
  const viewer = await requireOnboarded();
  const { id } = await params;
  const sp = await searchParams;
  const access = await contractAccess(viewer, id);
  if (!access) notFound();
  const { contract: c, role, otherId } = access;

  const db = createServiceClient();
  const { data: msData } = await db.from("milestones").select("*").eq("contract_id", c.id).order("seq");
  const milestones = (msData ?? []) as Milestone[];
  const mIds = milestones.map((m) => m.id);

  const none = { data: [] };
  const [subs, pays, pouts, msgs, revs, disputes] = await Promise.all([
    mIds.length ? db.from("submissions").select("*").in("milestone_id", mIds).order("created_at", { ascending: false }) : none,
    mIds.length && role !== "designer" ? db.from("payments").select("*").in("milestone_id", mIds).eq("status", "paid") : none,
    mIds.length && role !== "client" ? db.from("payouts").select("*").in("milestone_id", mIds) : none,
    db.from("messages").select("*").eq("contract_id", c.id).order("created_at", { ascending: false }).limit(200),
    db.from("reviews").select("*").eq("contract_id", c.id).order("created_at"),
    db.from("disputes").select("id, milestone_id, status, reason, raised_by, created_at").eq("contract_id", c.id).order("created_at", { ascending: false }),
  ]);
  const submissions = (subs.data ?? []) as SubmissionRow[];
  const payments = new Map(((pays.data ?? []) as PaymentRow[]).map((p) => [p.milestone_id, p]));
  const payouts = new Map(((pouts.data ?? []) as PayoutRow[]).map((p) => [p.milestone_id, p]));
  const messages = ((msgs.data ?? []) as Message[]).reverse();
  const reviews = (revs.data ?? []) as { id: string; reviewer_id: string; rating: number; comment: string; created_at: string }[];
  const files = await signedFiles(submissions.flatMap((s) => s.file_paths));

  const who = await people([c.client_id, c.designer_id, ...messages.map((m) => m.sender_id)]);
  const client = who.get(c.client_id);
  const designer = who.get(c.designer_id);
  const other = who.get(otherId);
  const otherName = other?.name ?? (role === "client" ? "the designer" : "the client");
  const chatPeople: Record<string, ChatPerson> = Object.fromEntries([...who.values()].map((p) => [p.id, { name: p.name, avatar: p.avatar }]));
  const figures = contractFigures(milestones);
  const myReview = reviews.find((r) => r.reviewer_id === viewer.id);
  const openDisputes = ((disputes.data ?? []) as { id: string; status: string; reason: string }[]).filter((d) => d.status === "open");

  return (
    <>
      <Link href="/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={14} /> All contracts
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{c.title}</h1>
            <ContractBadge status={c.status} />
            {c.repeat_hire && <Badge tone="brand">Repeat hire</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500">
            <span className="font-mono text-xs">{c.code}</span>
            {role === "admin" ? (
              <span>
                Client: <span className="text-ink-800">{displayName(client)}</span> · Designer: <span className="text-ink-800">{designer?.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Avatar name={other?.name} src={other?.avatar} size={22} />
                {role === "client" ? "Designer" : "Client"}: <span className="text-ink-800">{displayName(other)}</span>
              </span>
            )}
            <span>Started {formatDate(c.created_at)}</span>
          </div>
        </div>
        {role !== "admin" && (
          <LinkButton href={`/messages/${c.id}`} variant="secondary" className="xl:hidden">
            <MessageSquare size={14} /> Open chat
          </LinkButton>
        )}
      </div>

      {sp.disputed && <div className="mb-6"><FormNotice message="Your dispute has been raised. The money stays in escrow and our team will reply within 2 working days." /></div>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Contract value" value={formatINR(figures.total || c.total_amount)} sub={`${milestones.length} milestone${milestones.length === 1 ? "" : "s"}`} />
        <Stat label="Released" value={<span className="text-marigold-800">{formatINR(figures.released)}</span>} sub="Paid out to the designer" />
        <Stat label="In escrow" value={formatINR(figures.escrow)} sub="Funded, not yet released" />
        <Stat label="Not funded yet" value={formatINR(figures.unfunded)} sub={figures.refunded ? `${formatINR(figures.refunded)} refunded` : "Waiting for the client"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Offer state */}
          {c.status === "pending" && role === "designer" && (
            <Card className="border-marigold-300 bg-marigold-50 p-5 sm:p-6">
              <h2 className="font-semibold text-ink-900">{otherName} has sent you an offer</h2>
              <p className="mt-1 text-sm text-ink-700">
                {formatINR(c.total_amount)} across {milestones.length} milestone{milestones.length === 1 ? "" : "s"}. Accepting starts the contract. The client then funds each milestone into escrow before you start it.
              </p>
              <div className="mt-4 flex flex-wrap items-start gap-3">
                <ActionForm action={acceptOfferAction} className="gap-2">
                  <input type="hidden" name="contract_id" value={c.id} />
                  <SubmitButton pending="Accepting…">Accept offer</SubmitButton>
                </ActionForm>
                <ConfirmForm
                  action={declineOfferAction}
                  fields={{ contract_id: c.id }}
                  label="Decline"
                  variant="secondary"
                  confirmVariant="danger"
                  confirmLabel="Yes, decline this offer"
                  message="The client will be told you've declined. You can't undo this."
                />
              </div>
            </Card>
          )}
          {c.status === "pending" && role === "client" && (
            <Card className="p-5 text-sm text-ink-600">Waiting for {otherName} to accept your offer. We&apos;ll notify you as soon as they reply.</Card>
          )}
          {c.status === "cancelled" && (
            <Card className="p-5 text-sm text-ink-600">This offer was declined or cancelled. No money was taken.</Card>
          )}
          {openDisputes.length > 0 && role === "admin" && (
            <Card className="border-danger-600/30 bg-danger-50 p-5 text-sm text-danger-600">
              {openDisputes.length} open dispute{openDisputes.length === 1 ? "" : "s"}:{" "}
              {openDisputes.map((d) => (
                <Link key={d.id} href={`/admin/disputes/${d.id}`} className="mr-3 font-medium underline">{d.reason}</Link>
              ))}
            </Card>
          )}

          {c.scope && (
            <Card>
              <CardHeader title="Scope" />
              <CardBody className="whitespace-pre-wrap pt-3 text-sm text-ink-700">{c.scope}</CardBody>
            </Card>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold">Milestones</h2>
            {milestones.length === 0 ? (
              <EmptyState title="No milestones on this contract" body="Milestones are added when the client sends the offer. Ask the client to send a new offer with milestones." />
            ) : (
              milestones.map((m) => (
                <MilestoneCard
                  key={m.id}
                  m={m}
                  contract={c}
                  role={role}
                  viewerId={viewer.id}
                  otherName={otherName}
                  submissions={submissions.filter((s) => s.milestone_id === m.id)}
                  files={files}
                  payment={payments.get(m.id)}
                  payout={payouts.get(m.id)}
                  repeatHire={c.repeat_hire}
                />
              ))
            )}
          </section>

          {/* Reviews */}
          {c.status === "completed" && (
            <Card>
              <CardHeader title="Reviews" sub="Reviews are public and help others decide who to work with." />
              <CardBody className="flex flex-col gap-4">
                {reviews.map((r) => {
                  const by = who.get(r.reviewer_id);
                  return (
                    <div key={r.id} className="rounded-md border border-paper-200 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{r.reviewer_id === viewer.id ? "Your review" : `${by?.name ?? "Someone"}'s review`}</span>
                        <span className="flex text-marigold-500" aria-label={`${r.rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} />
                          ))}
                        </span>
                      </div>
                      {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{r.comment}</p>}
                    </div>
                  );
                })}
                {role !== "admin" && !myReview && (
                  <ActionForm action={leaveReviewAction} className="gap-4">
                    <input type="hidden" name="contract_id" value={c.id} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink-700">How was working with {otherName}?</span>
                      <RatingInput />
                    </div>
                    <Field label="A few words for others" hint="What went well, and what could be better?">
                      <Textarea name="comment" rows={3} maxLength={2000} />
                    </Field>
                    <SubmitButton pending="Posting…" className="self-start">Post review</SubmitButton>
                  </ActionForm>
                )}
                {reviews.length === 0 && role === "admin" && <p className="text-sm text-ink-500">Neither party has left a review yet.</p>}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Chat */}
        <aside className="min-w-0">
          <Card className="flex h-[640px] flex-col overflow-hidden xl:sticky xl:top-24">
            <div className="flex items-center justify-between border-b border-paper-200 px-5 py-3">
              <h2 className="text-sm font-semibold">Chat {role !== "admin" ? `with ${otherName}` : ""}</h2>
              {role !== "admin" && (
                <Link href={`/messages/${c.id}`} className="text-xs font-medium text-ink-500 hover:text-ink-900">Full screen</Link>
              )}
            </div>
            <ContractChat
              className="flex-1"
              contractId={c.id}
              viewerId={viewer.id}
              initialMessages={messages}
              people={chatPeople}
              readOnly={role === "admin"}
              markRead={markThreadRead}
              sendFallback={sendMessage}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
