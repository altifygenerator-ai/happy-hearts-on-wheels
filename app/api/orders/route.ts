import { NextResponse } from "next/server";
import { normalizeOrderInput, prepareSquareOrder } from "@/lib/orders";
import { assertOrderingOpen } from "@/lib/square-hours";
import {
  createSquareApproval,
  createSquareCheckout,
  squareApprovalModeEnabled,
  squareConfigured,
} from "@/lib/square";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!squareConfigured()) {
      throw new Error("Square ordering is not connected yet. Please call 501-613-1513.");
    }

    await assertOrderingOpen();
    const raw = await request.json();
    const input = normalizeOrderInput(raw);
    const order = await prepareSquareOrder(input);

    if (squareApprovalModeEnabled()) {
      const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const paymentSourceId = typeof value.paymentSourceId === "string" ? value.paymentSourceId : "";
      const expectedTotalCents = Number(value.expectedTotalCents);
      if (!paymentSourceId || !Number.isInteger(expectedTotalCents) || expectedTotalCents <= 0) {
        throw new Error("Payment authorization details are missing. Please try again.");
      }
      const approval = await createSquareApproval(order, paymentSourceId, expectedTotalCents);
      return NextResponse.json({
        ok: true,
        order: {
          orderNumber: approval.orderNumber,
          totalCents: approval.totalCents,
          squareOrderId: approval.squareOrderId,
          paymentId: approval.paymentId,
          delayedUntil: approval.delayedUntil,
          awaitingApproval: true,
        },
      });
    }

    const checkout = await createSquareCheckout(order);
    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        totalCents: order.subtotalCents,
        squareOrderId: checkout.squareOrderId,
        checkoutUrl: checkout.checkoutUrl,
        awaitingApproval: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The order could not be submitted.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
