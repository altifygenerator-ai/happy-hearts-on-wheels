import { NextRequest, NextResponse } from "next/server";
import { requestIsStaff } from "@/lib/staff-auth";
import { listPendingApprovalOrders } from "@/lib/square";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!requestIsStaff(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const orders = await listPendingApprovalOrders();
    return NextResponse.json({ ok: true, orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orders could not be loaded.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
