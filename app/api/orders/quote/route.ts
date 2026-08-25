import { NextResponse } from "next/server";
import { normalizeOrderInput, prepareSquareOrder } from "@/lib/orders";
import { assertOrderingOpen } from "@/lib/square-hours";
import {
  calculateSquareOrderTotal,
  squareApprovalConfigured,
} from "@/lib/square";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!squareApprovalConfigured()) {
      throw new Error("Order approval payments are not connected yet.");
    }
    await assertOrderingOpen();
    const raw = await request.json();
    const input = normalizeOrderInput(raw);
    const order = await prepareSquareOrder(input);
    const totalCents = await calculateSquareOrderTotal(order);
    return NextResponse.json({ ok: true, totalCents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The order total could not be checked.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
