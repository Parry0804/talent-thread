"use server";
import { requireOnboarded } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { contractAccess } from "@/components/contracts/data";
import type { Message } from "@/lib/types";

/** Marks the other party's messages in a contract as read. Parties only. */
export async function markThreadRead(contractId: string) {
  const viewer = await requireOnboarded();
  const access = await contractAccess(viewer, contractId);
  if (!access?.isParty) return;
  const db = createServiceClient();
  await db
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("contract_id", contractId)
    .neq("sender_id", viewer.id)
    .is("read_at", null);
}

/** Fallback sender, used if the browser insert fails. */
export async function sendMessage(contractId: string, body: string): Promise<{ error?: string; message?: Message }> {
  const viewer = await requireOnboarded();
  const access = await contractAccess(viewer, contractId);
  if (!access?.isParty) return { error: "Only the client and designer on this contract can send messages." };
  const text = body.trim().slice(0, 5000);
  if (!text) return { error: "Write a message first." };
  const db = createServiceClient();
  const { data, error } = await db
    .from("messages")
    .insert({ contract_id: contractId, sender_id: viewer.id, body: text })
    .select()
    .single<Message>();
  if (error || !data) return { error: "Your message didn't send. Please try again." };
  return { message: data };
}
