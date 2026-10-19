import "server-only";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";

/** Invite a designer to one of the client's open jobs. Returns an error message or null. */
export async function sendInvite(clientId: string, companyName: string, jobId: string, designerId: string, message: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title, status, client_id").eq("id", jobId).eq("client_id", clientId).maybeSingle();
  if (!job) return "That job isn't one of yours.";
  if (job.status !== "open") return "Publish the job before inviting designers.";

  const { data: designer } = await supabase.from("designer_profiles").select("id").eq("id", designerId).maybeSingle();
  if (!designer) return "We couldn't find that designer.";

  const { error } = await supabase
    .from("invites")
    .insert({ job_id: jobId, designer_id: designerId, client_id: clientId, message: message.trim().slice(0, 1000) });
  if (error) {
    if (error.code === "23505") return "You've already invited this designer to that job.";
    return "We couldn't send the invite. Please try again.";
  }
  await notify(
    designerId,
    "invite",
    `${companyName || "A client"} invited you to apply`,
    message.trim() ? message.trim().slice(0, 140) : `“${job.title}” — take a look and send a proposal if it suits you.`,
    `/designer/jobs/${jobId}`,
  );
  return null;
}
