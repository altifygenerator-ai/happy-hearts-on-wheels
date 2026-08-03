import type { PreparedOrder } from "@/lib/orders";

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


function pickupPrepDuration() {
  const configured = Number(process.env.SQUARE_PICKUP_PREP_TIME_MINUTES || "20");
  const minutes = Number.isFinite(configured) ? Math.min(240, Math.max(1, Math.round(configured))) : 20;
  return `PT${minutes}M`;
}

function pickupNote(order: PreparedOrder) {
  return [
    order.requestedTime ? `Requested pickup: ${order.requestedTime}` : "Pickup: as soon as available",
    order.notes ? `Customer note: ${order.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 500);
}

export async function createSquareCheckout(order: PreparedOrder) {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) {
    throw new Error("Square checkout is not connected yet.");
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const lineItems = order.items.map((line) => ({
    catalog_object_id: line.squareVariationId,
    quantity: String(line.quantity),
    ...(line.squareModifierIds.length
      ? {
          modifiers: line.squareModifierIds.map((modifierId) => ({
            catalog_object_id: modifierId,
            quantity: "1",
          })),
        }
      : {}),
    ...(line.selectionLabels.length
      ? { note: line.selectionLabels.join(" · ").slice(0, 500) }
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
      idempotency_key: order.idempotencyKey,
      description: `Happy Hearts website order ${order.orderNumber}`,
      payment_note: `${order.orderNumber} · ${order.customerName} · ${order.phone}`.slice(0, 500),
      order: {
        location_id: locationId,
        reference_id: order.orderNumber,
        source: { name: "Happy Hearts Website" },
        line_items: lineItems,
        pricing_options: {
          auto_apply_taxes: true,
          auto_apply_discounts: true,
        },
        fulfillments: [
          {
            type: "PICKUP",
            state: "PROPOSED",
            pickup_details: {
              schedule_type: "ASAP",
              prep_time_duration: pickupPrepDuration(),
              recipient: {
                display_name: order.customerName,
                phone_number: order.phone,
                ...(order.email ? { email_address: order.email } : {}),
              },
              note: pickupNote(order),
            },
          },
        ],
      },
      checkout_options: {
        redirect_url: `${siteUrl}/order?payment=return&order=${encodeURIComponent(order.orderNumber)}`,
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
    throw new Error(details || "Square checkout could not be opened. Please call 501-613-1513.");
  }

  return {
    checkoutUrl: result.payment_link.url,
    paymentLinkId: result.payment_link.id ?? null,
    squareOrderId: result.payment_link.order_id,
  };
}
