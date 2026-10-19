import { isConfigured } from "@/lib/env";

/** Shown until Supabase keys are added, so a fresh deploy explains itself. */
export function SetupNotice() {
  if (isConfigured()) return null;
  return (
    <div className="rounded-md border border-marigold-300 bg-marigold-50 px-4 py-3 text-sm text-marigold-800">
      This copy of Talent Thread isn&apos;t connected to its database yet. Add the Supabase keys from README.md to sign up and log in.
    </div>
  );
}
