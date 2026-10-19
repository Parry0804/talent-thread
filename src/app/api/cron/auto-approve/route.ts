import { NextResponse } from "next/server";
import { runAutoApprovals } from "@/lib/escrow";

// Daily job (see vercel.json): releases milestones whose 5-day review window has passed.
// Vercel sends "Authorization: Bearer $CRON_SECRET" automatically when CRON_SECRET is set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const released = await runAutoApprovals();
  return NextResponse.json({ ok: true, released });
}
