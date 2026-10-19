import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { MilestoneBadge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { LinkButton } from "@/components/ui/button";
import { FileUpload } from "@/components/contracts/file-upload";
import { contractAccess } from "@/components/contracts/data";
import { DISPUTABLE_STATES, DISPUTE_REASONS } from "@/components/contracts/util";
import { formatINR } from "@/lib/money";
import type { Milestone } from "@/lib/types";
import { raiseDisputeAction } from "./actions";

export const metadata = { title: "Raise a dispute" };

export default async function DisputePage({ params, searchParams }: PageProps<"/contracts/[id]/dispute">) {
  const viewer = await requireOnboarded();
  const { id } = await params;
  const { m: mParam } = await searchParams;
  const access = await contractAccess(viewer, id);
  if (!access) notFound();
  const { contract: c, role } = access;
  const back = `/contracts/${c.id}`;

  const db = createServiceClient();
  const { data } = await db.from("milestones").select("*").eq("contract_id", c.id).order("seq");
  const disputable = ((data ?? []) as Milestone[]).filter((m) => (DISPUTABLE_STATES as readonly string[]).includes(m.status));
  const chosen = disputable.find((m) => m.id === mParam) ?? (disputable.length === 1 ? disputable[0] : undefined);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={14} /> Back to {c.title}
      </Link>
      <PageHeader
        title="Raise a dispute"
        sub="Something's gone wrong and you can't sort it out in the chat? Tell us what happened. The money stays in escrow until the Talent Thread team decides, usually within 2 working days."
      />

      {role === "admin" ? (
        <EmptyState title="Admins resolve disputes, they don't raise them" body="Open the disputes queue to review and decide open disputes." action={<LinkButton href="/admin/disputes">Go to disputes</LinkButton>} />
      ) : disputable.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={28} />}
          title="No milestone can be disputed right now"
          body="Disputes are for milestones that are funded but not yet released. If you need help with something else, message the other party first."
          action={<LinkButton href={back} variant="secondary">Back to the contract</LinkButton>}
        />
      ) : (
        <Card className="p-6 sm:p-8">
          <ActionForm action={raiseDisputeAction}>
            <input type="hidden" name="contract_id" value={c.id} />
            {chosen ? (
              <div className="flex items-center justify-between gap-3 rounded-md bg-paper-50 p-4">
                <div>
                  <p className="text-xs text-ink-500">Milestone {chosen.seq}</p>
                  <p className="font-medium">{chosen.title}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular">{formatINR(chosen.amount)}</span>
                  <MilestoneBadge status={chosen.status} />
                </div>
                <input type="hidden" name="milestone_id" value={chosen.id} />
              </div>
            ) : (
              <Field label="Which milestone?">
                <Select name="milestone_id" required defaultValue="">
                  <option value="" disabled>Choose a milestone…</option>
                  {disputable.map((m) => (
                    <option key={m.id} value={m.id}>
                      Milestone {m.seq}: {m.title} ({formatINR(m.amount)})
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="What's the problem?">
              <Select name="reason" required defaultValue="">
                <option value="" disabled>Choose a reason…</option>
                {DISPUTE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tell us what happened" hint="Dates, what was agreed, what was delivered, and what you'd consider fair. Our team reads the chat history too.">
              <Textarea name="details" rows={6} required minLength={20} maxLength={5000} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-700">Evidence (optional)</span>
              <FileUpload userId={viewer.id} name="evidence_paths" label="Upload screenshots or files" hint="Only you and the Talent Thread team reviewing the dispute can open these." />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton variant="danger" pending="Raising dispute…">Raise dispute and freeze the money</SubmitButton>
              <LinkButton href={back} variant="ghost">Cancel</LinkButton>
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
