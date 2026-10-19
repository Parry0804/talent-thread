"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { audit, notify } from "@/lib/notify";
import type { ActionState } from "@/components/ui/action-form";

const revalidate = (id: string) => {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
};

export async function setSuspended(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(fd.get("user_id") ?? "");
  const suspend = fd.get("suspend") === "1";
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 500);
  if (id === admin.id) return { error: "You can't suspend your own account." };
  const db = createServiceClient();
  const { data: target } = await db.from("profiles").select("id, role, full_name").eq("id", id).maybeSingle();
  if (!target) return { error: "User not found." };
  if (target.role === "admin" && suspend) return { error: "Remove admin rights before suspending another admin." };
  const { error } = await db.from("profiles").update({ suspended: suspend }).eq("id", id);
  if (error) return { error: "Couldn't update this user." };
  await audit(admin.id, suspend ? "user.suspend" : "user.unsuspend", "profile", id, reason ? { reason } : {});
  if (!suspend) await notify(id, "account", "Your account is active again", "You can use Talent Thread as normal.");
  revalidate(id);
  return { notice: suspend ? `${target.full_name || "User"} is suspended.` : `${target.full_name || "User"} can use Talent Thread again.` };
}

export async function makeAdmin(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(fd.get("user_id") ?? "");
  const db = createServiceClient();
  const { data: target } = await db.from("profiles").select("id, role, full_name").eq("id", id).maybeSingle();
  if (!target) return { error: "User not found." };
  if (target.role === "admin") return { notice: "Already an admin." };
  const { error } = await db.from("profiles").update({ role: "admin", onboarded: true }).eq("id", id);
  if (error) return { error: "Couldn't update this user." };
  await audit(admin.id, "user.make_admin", "profile", id, { previous_role: target.role });
  await notify(id, "account", "You're now a Talent Thread admin", "Sign in again to see the admin panel.", "/admin");
  revalidate(id);
  return { notice: `${target.full_name || "User"} is now an admin.` };
}
