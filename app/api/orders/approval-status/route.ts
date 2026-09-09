import { NextResponse } from "next/server";
import { getApprovalPaymentStatus } from "@/lib/square";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const squareOrderId = url.searchParams.get("orderId") || "";
    const paymentId = url.searchParams.get("paymentId") || "";
    if (!squareOrderId || !paymentId) throw new Error("Order approval details are missing.");

    const result = await getApprovalPaymentStatus(squareOrderId, paymentId);
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval status could not be checked.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
