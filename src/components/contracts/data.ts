import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { fileName } from "@/components/contracts/util";
import type { Contract, Profile } from "@/lib/types";

export type PartyRole = "client" | "designer" | "admin";

/**
 * Loads a contract and works out how the viewer relates to it.
 * Returns null when the contract doesn't exist or the viewer isn't a party (admins always pass).
 */
export async function contractAccess(viewer: Pick<Profile, "id" | "role">, contractId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(contractId)) return null;
  const db = createServiceClient();
  const { data: contract } = await db.from("contracts").select("*").eq("id", contractId).maybeSingle<Contract>();
  if (!contract) return null;
  const role: PartyRole | null =
    contract.client_id === viewer.id ? "client" : contract.designer_id === viewer.id ? "designer" : viewer.role === "admin" ? "admin" : null;
  if (!role) return null;
  const otherId = role === "client" ? contract.designer_id : contract.client_id;
  return { contract, role, otherId, isParty: role !== "admin" };
}

export interface Person {
  id: string;
  name: string;
  avatar: string | null;
  role: Profile["role"];
  company: string | null;
}

/** Names, avatars and company names for a set of profile ids. */
export async function people(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  const map = new Map<string, Person>();
  if (!unique.length) return map;
  const db = createServiceClient();
  const [{ data: profiles }, { data: companies }] = await Promise.all([
    db.from("profiles").select("id, full_name, avatar_url, role").in("id", unique),
    db.from("client_profiles").select("id, company_name").in("id", unique),
  ]);
  const co = new Map((companies ?? []).map((c) => [c.id as string, (c.company_name as string) || null]));
  for (const p of profiles ?? []) {
    map.set(p.id, { id: p.id, name: p.full_name || "Unnamed user", avatar: p.avatar_url, role: p.role, company: co.get(p.id) ?? null });
  }
  return map;
}

export const displayName = (p: Person | undefined) => (p ? (p.company ? `${p.name} · ${p.company}` : p.name) : "Someone");

/** Signed download links for private files (deliverables, evidence). Call only after checking access. */
export async function signedFiles(paths: string[], bucket: "deliverables" | "job-files" = "deliverables", expiresIn = 3600) {
  const clean = [...new Set(paths.filter(Boolean))];
  const out = new Map<string, { path: string; name: string; url: string | null }>();
  if (!clean.length) return out;
  const db = createServiceClient();
  const { data } = await db.storage.from(bucket).createSignedUrls(clean, expiresIn);
  clean.forEach((p, i) => out.set(p, { path: p, name: fileName(p), url: data?.[i]?.signedUrl ?? null }));
  return out;
}
