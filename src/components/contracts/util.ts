// Small helpers shared by the contract, messages and admin screens (safe on server and client).

/** "uid/uuid-brief.pdf" → "brief.pdf" */
export function fileName(path: string) {
  const last = path.split("/").pop() ?? path;
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

/** Turns any thrown value (EscrowError, Error, Razorpay error object) into a sentence for the user. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  if (e instanceof Error && e.message) return e.message;
  const rz = e as { error?: { description?: string } } | null;
  return rz?.error?.description || fallback;
}

/** Whole days from now until an ISO date (0 if already past). */
export function daysUntil(iso: string | null | undefined) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export const ESCROW_STATES = ["funded", "submitted", "changes_requested", "approved", "disputed"] as const;
export const DISPUTABLE_STATES = ["funded", "submitted", "changes_requested"] as const;

export const DISPUTE_REASONS = [
  "Work not delivered",
  "Quality doesn't match the brief",
  "Scope disagreement",
  "Client unresponsive",
  "Other",
] as const;

/** Money figures for a contract header, from its milestones. */
export function contractFigures(ms: { amount: number; status: string }[]) {
  const sum = (pred: (s: string) => boolean) => ms.filter((m) => pred(m.status)).reduce((a, m) => a + m.amount, 0);
  return {
    total: ms.reduce((a, m) => a + m.amount, 0),
    released: sum((s) => s === "released"),
    escrow: sum((s) => (ESCROW_STATES as readonly string[]).includes(s)),
    unfunded: sum((s) => s === "awaiting_funding"),
    refunded: sum((s) => s === "refunded"),
  };
}
