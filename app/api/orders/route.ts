import { NextResponse } from "next/server";
import {
  createOrder,
  normalizeOrderInput,
  updateOrderPayment,
} from "@/lib/orders";
import { sendOrderNotifications } from "@/lib/order-notifications";
import { createSquareCheckout, squareConfigured } from "@/lib/square";

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const input = normalizeOrderInput(raw);

    if (input.paymentMethod === "square" && !squareConfigured()) {
      throw new Error("Square checkout is not connected yet. Choose pay after confirmation.");
    }

    let order = await createOrder(input);
    let checkoutUrl: string | undefined;

    if (input.paymentMethod === "square") {
      try {
        const checkout = await createSquareCheckout(order);
        checkoutUrl = checkout.checkoutUrl;
        order = await updateOrderPayment(order.id, {
          payment_status: "pending",
          square_payment_link_id: checkout.paymentLinkId,
          square_order_id: checkout.squareOrderId,
        });
      } catch (squareError) {
        await updateOrderPayment(order.id, { payment_status: "failed" }).catch(() => undefined);
        throw squareError;
      }
    }

    await sendOrderNotifications(order);
    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalCents: order.total_cents,
        status: order.status,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        checkoutUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The order could not be submitted.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
