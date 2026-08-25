import { NextRequest, NextResponse } from "next/server";
import { requestIsStaff } from "@/lib/staff-auth";
import { acceptPendingApproval } from "@/lib/square";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!requestIsStaff(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { paymentId?: string };
    if (!body.paymentId) throw new Error("Payment ID is missing.");
    await acceptPendingApproval(id, body.paymentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The order could not be accepted.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
