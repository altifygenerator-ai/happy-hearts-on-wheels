import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  updateOrderPaymentBySquareOrderId,
  type PaymentStatus,
} from "@/lib/orders";

type SquarePaymentEvent = {
  type?: string;
  data?: {
    object?: {
      payment?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
};

function webhookUrl() {
  if (process.env.SQUARE_WEBHOOK_NOTIFICATION_URL) {
    return process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  }
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${siteUrl}/api/square/webhook`;
}

function isValidSignature(rawBody: string, signatureHeader: string | null) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey || !signatureHeader) return false;

  const expected = createHmac("sha256", signatureKey)
    .update(webhookUrl() + rawBody)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signatureHeader);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function mapPaymentStatus(status?: string): PaymentStatus | null {
  switch (status) {
    case "COMPLETED":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELED":
      return "cancelled";
    case "PENDING":
    case "APPROVED":
      return "pending";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 403 });
  }

  try {
    const event = JSON.parse(rawBody) as SquarePaymentEvent;
    if (event.type !== "payment.created" && event.type !== "payment.updated") {
      return NextResponse.json({ ok: true });
    }

    const payment = event.data?.object?.payment;
    const paymentStatus = mapPaymentStatus(payment?.status);
    if (payment?.order_id && paymentStatus) {
      await updateOrderPaymentBySquareOrderId(payment.order_id, {
        payment_status: paymentStatus,
        square_payment_id: payment.id ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Square webhook error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
