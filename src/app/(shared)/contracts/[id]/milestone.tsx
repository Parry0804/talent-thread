import Link from "next/link";
import { AlertTriangle, CalendarClock, ShieldCheck } from "lucide-react";
import { SubmissionView, type FileLink, type SubmissionRow } from "@/components/contracts/submission-view";
import { Card } from "@/components/ui/card";
import { MilestoneBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/contracts/confirm-form";
import { FileUpload } from "@/components/contracts/file-upload";
import { RazorpayCheckoutButton } from "@/components/contracts/razorpay-checkout-button";
import { DISPUTABLE_STATES, daysUntil } from "@/components/contracts/util";
import type { PartyRole } from "@/components/contracts/data";
import { formatINR, MAX_REVISIONS, AUTO_APPROVE_DAYS } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Contract, Milestone } from "@/lib/types";
import {
  confirmFundingAction, releaseAction, requestChangesAction, startFundingAction, submitWorkAction,
} from "./actions";

export interface PaymentRow { milestone_id: string; amount: number; platform_fee: number; gst: number; total_paise: number; status: string; paid_at: string | null; razorpay_payment_id: string | null }
export interface PayoutRow { milestone_id: string; gross: number; commission: number; tds: number; net: number; status: string; paid_at: string | null; reference: string | null }

function Breakdown({ rows }: { rows: [string, string, boolean?][] }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 rounded-md bg-paper-50 p-4 text-sm">
      {rows.map(([k, v, strong]) => (
        <div key={k} className="contents">
          <dt className={strong ? "border-t border-paper-200 pt-1.5 font-semibold text-ink-900" : "text-ink-500"}>{k}</dt>
          <dd className={strong ? "border-t border-paper-200 pt-1.5 text-right font-semibold tabular text-ink-900" : "text-right tabular"}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MilestoneCard({
  m,
  contract,
  role,
  viewerId,
  otherName,
  submissions,
  files,
  payment,
  payout,
  repeatHire,
}: {
  m: Milestone;
  contract: Contract;
  role: PartyRole;
  viewerId: string;
  otherName: string;
  submissions: SubmissionRow[];
  files: Map<string, FileLink>;
  payment?: PaymentRow;
  payout?: PayoutRow;
  repeatHire: boolean;
}) {
  const latest = submissions[0];
  const latestShown = m.status === "submitted" || m.status === "changes_requested";
  const older = latestShown ? submissions.slice(1) : submissions;
  const active = contract.status === "active";
  // Work and reviews carry on while another milestone is in dispute; only new funding waits.
  const live = active || contract.status === "disputed";
  const canDispute = role !== "admin" && (DISPUTABLE_STATES as readonly string[]).includes(m.status) && live;
  const hidden = { contract_id: contract.id, milestone_id: m.id };
  const disputeHref = `/contracts/${contract.id}/dispute?m=${m.id}`;
  const roundsLeft = MAX_REVISIONS - m.revision_count;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">Milestone {m.seq}</p>
          <h3 className="mt-0.5 font-semibold text-ink-900">{m.title}</h3>
          {m.description && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600">{m.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
            {m.due_date && <span>Due {formatDate(m.due_date)}</span>}
            {m.funded_at && <span>Funded {formatDate(m.funded_at)}</span>}
            {m.revision_count > 0 && <span>Revision rounds used: {m.revision_count} of {MAX_REVISIONS}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="font-display text-xl font-semibold tabular">{formatINR(m.amount)}</span>
          <MilestoneBadge status={m.status} />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {/* ── Awaiting funding ── */}
        {m.status === "awaiting_funding" && role === "client" && active && (
          <RazorpayCheckoutButton milestoneId={m.id} amount={m.amount} start={startFundingAction} confirm={confirmFundingAction} />
        )}
        {m.status === "awaiting_funding" && role === "client" && contract.status === "pending" && (
          <p className="text-sm text-ink-500">You can fund this milestone once {otherName} accepts the offer.</p>
        )}
        {m.status === "awaiting_funding" && role === "designer" && (
          <p className="text-sm text-ink-500">
            {active ? "Waiting for the client to fund this milestone. Please don't start work until it shows as funded." : "This milestone will be funded after you accept the offer."}
          </p>
        )}

        {/* ── Funded / changes requested ── */}
        {(m.status === "funded" || m.status === "changes_requested") && (
          <>
            {m.status === "changes_requested" && latest && <SubmissionView s={latest} files={files} title="Your last submission" />}
            {role === "designer" && live ? (
              <div className="flex flex-col gap-3 rounded-md border border-paper-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <ShieldCheck size={16} className="text-success-600" />
                  {formatINR(m.amount)} is safe in escrow. {m.status === "changes_requested" ? "Send your revised work." : "Submit your work when it's ready."}
                </div>
                <ActionForm action={submitWorkAction} className="gap-4">
                  <input type="hidden" name="contract_id" value={contract.id} />
                  <input type="hidden" name="milestone_id" value={m.id} />
                  <Field label="Note for the client" hint="What's included, what changed, and anything they should check.">
                    <Textarea name="note" rows={4} placeholder="Here are the three logo routes with the colour variations we discussed…" />
                  </Field>
                  <Field label="Links" hint="Figma, Drive or prototype links. Put each on its own line.">
                    <Textarea name="links" rows={2} placeholder="https://www.figma.com/file/…" className="min-h-16" />
                  </Field>
                  <FileUpload userId={viewerId} label="Upload deliverables" />
                  <SubmitButton pending="Submitting…" className="self-start">
                    {m.status === "changes_requested" ? "Submit revised work" : "Submit work for review"}
                  </SubmitButton>
                </ActionForm>
              </div>
            ) : (
              <p className="text-sm text-ink-500">
                {role === "client"
                  ? m.status === "changes_requested"
                    ? `${otherName} is working on your requested changes.`
                    : `${formatINR(m.amount)} is held in escrow. ${otherName} is working on this milestone.`
                  : "The designer is working on this milestone."}
              </p>
            )}
          </>
        )}

        {/* ── Submitted, waiting for the client ── */}
        {m.status === "submitted" && latest && (
          <>
            <SubmissionView s={latest} files={files} />
            <p className="flex items-center gap-2 text-sm text-ink-600">
              <CalendarClock size={15} className="text-ink-400" />
              Auto-approves on {formatDate(m.auto_approve_at)}
              {m.auto_approve_at && <span className="text-ink-400">({daysUntil(m.auto_approve_at)} day{daysUntil(m.auto_approve_at) === 1 ? "" : "s"} left)</span>}
            </p>
            {role === "client" && live && (
              <div className="flex flex-col gap-3">
                <ConfirmForm
                  action={releaseAction}
                  fields={hidden}
                  label={`Approve and release ${formatINR(m.amount)}`}
                  confirmLabel={`Yes, release ${formatINR(m.amount)}`}
                  variant="highlight"
                  message={
                    <>
                      <p className="font-semibold text-ink-900">Release {formatINR(m.amount)} to {otherName}?</p>
                      <p className="mt-1">This approves milestone {m.seq} and pays the designer from escrow. It can&apos;t be undone.</p>
                    </>
                  }
                />
                <details className="group rounded-md border border-paper-200">
                  <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-paper-50">
                    Request changes {roundsLeft > 0 ? `(round ${m.revision_count + 1} of ${MAX_REVISIONS})` : "(no rounds left)"}
                  </summary>
                  <div className="border-t border-paper-200 p-4">
                    {roundsLeft > 0 ? (
                      <ActionForm action={requestChangesAction} className="gap-3">
                        <input type="hidden" name="contract_id" value={contract.id} />
                        <input type="hidden" name="milestone_id" value={m.id} />
                        <Field label={`What should change? This is round ${m.revision_count + 1} of ${MAX_REVISIONS}.`}>
                          <Textarea name="feedback" rows={4} required placeholder="Be specific: which screen or file, what to change, and why." />
                        </Field>
                        <SubmitButton variant="secondary" pending="Sending…" className="self-start">Send feedback to the designer</SubmitButton>
                      </ActionForm>
                    ) : (
                      <p className="text-sm text-ink-600">
                        You&apos;ve used both revision rounds. Approve the work, or raise a dispute if it doesn&apos;t match what you agreed.
                      </p>
                    )}
                  </div>
                </details>
                <Link href={disputeHref} className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-danger-600 hover:underline">
                  <AlertTriangle size={14} /> Something is wrong
                </Link>
              </div>
            )}
            {role === "designer" && (
              <p className="text-sm text-ink-500">
                Waiting for the client to review. If they don&apos;t respond, it&apos;s approved automatically after {AUTO_APPROVE_DAYS} days and paid to you.
              </p>
            )}
          </>
        )}

        {m.status === "disputed" && (
          <p className="flex items-start gap-2 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            This milestone is under review by the Talent Thread team. The money stays in escrow until they decide.
          </p>
        )}
        {m.status === "refunded" && <p className="text-sm text-ink-500">This milestone was refunded to the client.</p>}

        {/* ── Payment details ── */}
        {m.status === "released" && (role === "designer" || role === "admin") && payout && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink-900">
              {role === "designer" ? "Your payout" : "Designer payout"}
              <span className="ml-2 font-normal text-ink-500">
                {payout.status === "paid" ? `Paid ${formatDate(payout.paid_at)}${payout.reference ? ` · Ref ${payout.reference}` : ""}` : "Being processed"}
              </span>
            </p>
            <Breakdown
              rows={[
                ["Released amount", formatINR(payout.gross)],
                [`Commission (${repeatHire ? "5%, repeat hire" : "10%"})`, `− ${formatINR(payout.commission)}`],
                ["TDS (0.1%, Section 194-O)", `− ${formatINR(payout.tds)}`],
                [role === "designer" ? "You receive" : "Net to designer", formatINR(payout.net), true],
              ]}
            />
          </div>
        )}
        {m.status === "released" && (role === "client" || role === "admin") && payment && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink-900">
              {role === "client" ? "What you paid" : "Client charge"}
              <span className="ml-2 font-normal text-ink-500">
                {payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : ""}
                {payment.razorpay_payment_id ? ` · ${payment.razorpay_payment_id}` : ""}
              </span>
            </p>
            <Breakdown
              rows={[
                ["Milestone amount", formatINR(payment.amount)],
                ["Platform fee (3%)", formatINR(payment.platform_fee)],
                ["GST on fee (18%)", formatINR(payment.gst)],
                ["Total charged", formatINR(Math.round(payment.total_paise / 100)), true],
              ]}
            />
          </div>
        )}

        {canDispute && m.status !== "submitted" && (
          <Link href={disputeHref} className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-ink-500 hover:text-danger-600">
            <AlertTriangle size={12} /> Raise a dispute
          </Link>
        )}
        {canDispute && m.status === "submitted" && role === "designer" && (
          <Link href={disputeHref} className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-ink-500 hover:text-danger-600">
            <AlertTriangle size={12} /> Raise a dispute
          </Link>
        )}

        {older.length > 0 && (
          <details className="rounded-md border border-paper-200">
            <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-paper-50">
              {latestShown ? "Earlier submissions" : "Submissions"} ({older.length})
            </summary>
            <div className="flex flex-col gap-3 border-t border-paper-200 p-4">
              {older.map((s) => (
                <SubmissionView key={s.id} s={s} files={files} title="Submission" />
              ))}
            </div>
          </details>
        )}
      </div>
      {role === "admin" && m.status === "disputed" && (
        <div className="mt-4">
          <LinkButton href="/admin/disputes" variant="secondary" size="sm">Open disputes queue</LinkButton>
        </div>
      )}
    </Card>
  );
}
