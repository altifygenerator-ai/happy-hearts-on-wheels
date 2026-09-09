import { NextRequest, NextResponse } from "next/server";
import { requestIsStaff } from "@/lib/staff-auth";
import { recordStaffHeartbeat } from "@/lib/ordering-control";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!requestIsStaff(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const heartbeatAt = await recordStaffHeartbeat();
    return NextResponse.json(
      { ok: true, heartbeatAt },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The kitchen connection could not be updated.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
