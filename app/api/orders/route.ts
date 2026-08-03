import { NextResponse } from "next/server";
import { normalizeOrderInput, prepareSquareOrder } from "@/lib/orders";
import { createSquareCheckout, squareConfigured } from "@/lib/square";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!squareConfigured()) {
      throw new Error("Square ordering is not connected yet. Please call 501-613-1513.");
    }

    const raw = await request.json();
    const input = normalizeOrderInput(raw);
    const order = await prepareSquareOrder(input);
    const checkout = await createSquareCheckout(order);

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        totalCents: order.subtotalCents,
        squareOrderId: checkout.squareOrderId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The order could not be submitted.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
