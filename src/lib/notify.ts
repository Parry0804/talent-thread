import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/** In-app notification (email delivery can hook in here later via Resend). */
export async function notify(userId: string, type: string, title: string, body = "", link?: string) {
  const db = createServiceClient();
  await db.from("notifications").insert({ user_id: userId, type, title, body, link: link ?? null });
}

export async function audit(actorId: string | null, action: string, entity: string, entityId: string, meta: Record<string, unknown> = {}) {
  const db = createServiceClient();
  await db.from("audit_log").insert({ actor_id: actorId, action, entity, entity_id: entityId, meta });
}

/** A system line in a contract's chat, e.g. "Milestone 2 funded". */
export async function systemMessage(contractId: string, senderId: string, body: string) {
  const db = createServiceClient();
  await db.from("messages").insert({ contract_id: contractId, sender_id: senderId, body, is_system: true });
}
