import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { SQUARE_CATALOG_CACHE_TAG } from "@/lib/square-catalog";
import { cleanupCanceledWebsiteOrder } from "@/lib/square";

type SquareWebhookEvent = {
  type?: string;
  event_id?: string;
  data?: {
    object?: {
      payment?: {
        status?: string;
        order_id?: string;
        reference_id?: string;
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

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 403 });
  }

  try {
    const event = JSON.parse(rawBody) as SquareWebhookEvent;

    if (event.type === "catalog.version.updated") {
      revalidateTag(SQUARE_CATALOG_CACHE_TAG, { expire: 0 });
      revalidatePath("/");
      revalidatePath("/menu");
      revalidatePath("/order");
    }

    if (event.type === "payment.updated") {
      const payment = event.data?.object?.payment;
      if (
        payment?.order_id &&
        payment.reference_id?.startsWith("HH-") &&
        (payment.status === "CANCELED" || payment.status === "FAILED")
      ) {
        await cleanupCanceledWebsiteOrder(payment.order_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Square webhook error", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
