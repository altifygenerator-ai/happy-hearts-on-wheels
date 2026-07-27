import type { StoredOrder } from "@/lib/orders";

const DEFAULT_SQUARE_API_VERSION = "2026-07-15";

export function squareConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function squareBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

type SquareCheckoutResponse = {
  payment_link?: {
    id?: string;
    order_id?: string;
    url?: string;
    long_url?: string;
  };
  errors?: Array<{ detail?: string; code?: string }>;
};

export async function createSquareCheckout(order: StoredOrder) {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) {
    throw new Error("Square checkout is not connected yet.");
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const lineItems = order.items.map((line) => ({
    name: line.name.slice(0, 120),
    quantity: String(line.quantity),
    base_price_money: {
      amount: line.unitPriceCents,
      currency: "USD",
    },
    ...(line.selections.length
      ? { note: line.selections.join(" · ").slice(0, 500) }
      : {}),
  }));

  const response = await fetch(`${squareBaseUrl()}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_API_VERSION || DEFAULT_SQUARE_API_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: order.id,
      description: `Happy Hearts order ${order.order_number}`,
      payment_note: `${order.order_number} · ${order.customer_name} · ${order.phone}`.slice(0, 500),
      order: {
        location_id: locationId,
        reference_id: order.order_number,
        line_items: lineItems,
      },
      checkout_options: {
        redirect_url: `${siteUrl}/order?payment=return&order=${encodeURIComponent(order.order_number)}`,
      },
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as SquareCheckoutResponse;
  if (!response.ok || !result.payment_link?.url || !result.payment_link.order_id) {
    const details = result.errors
      ?.map((error) => error.detail || error.code)
      .filter(Boolean)
      .join(" ");
    console.error("Square checkout error", response.status, result);
    throw new Error(details || "Square checkout could not be opened. Please choose pay after confirmation.");
  }

  return {
    checkoutUrl: result.payment_link.url,
    paymentLinkId: result.payment_link.id ?? null,
    squareOrderId: result.payment_link.order_id,
  };
}
