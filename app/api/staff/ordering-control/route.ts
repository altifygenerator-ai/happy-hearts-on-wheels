import { NextRequest, NextResponse } from "next/server";
import { requestIsStaff } from "@/lib/staff-auth";
import {
  getOrderingControlSnapshot,
  resumeManualOrdering,
  setManualOrderingPause,
} from "@/lib/ordering-control";
import { getOrderingStatus } from "@/lib/square-hours";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!requestIsStaff(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [control, status] = await Promise.all([
    getOrderingControlSnapshot(),
    getOrderingStatus(),
  ]);

  return NextResponse.json(
    { ok: true, control, status },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: NextRequest) {
  if (!requestIsStaff(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { action?: string; minutes?: number | null };
    if (body.action === "resume") {
      await resumeManualOrdering();
    } else if (body.action === "pause") {
      const minutes = body.minutes == null ? null : Number(body.minutes);
      if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) {
        throw new Error("Pause duration is invalid.");
      }
      await setManualOrderingPause(minutes);
    } else {
      throw new Error("Ordering control action is invalid.");
    }

    const [control, status] = await Promise.all([
      getOrderingControlSnapshot(),
      getOrderingStatus(),
    ]);
    return NextResponse.json({ ok: true, control, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Online ordering could not be updated.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
