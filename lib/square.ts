import type { PreparedOrder } from "@/lib/orders";

const DEFAULT_SQUARE_API_VERSION = "2026-07-15";

export function squareConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

export function squareApprovalModeEnabled() {
  return process.env.SQUARE_PAYMENT_MODE === "approval";
}

export function squareApprovalConfigured() {
  return Boolean(
    squareApprovalModeEnabled() &&
      process.env.SQUARE_APPLICATION_ID &&
      process.env.SQUARE_ACCESS_TOKEN &&
      process.env.SQUARE_LOCATION_ID,
  );
}

export function getSquarePaymentClientConfig() {
  if (!squareApprovalConfigured()) return null;
  return {
    applicationId: process.env.SQUARE_APPLICATION_ID!,
    locationId: process.env.SQUARE_LOCATION_ID!,
    sdkUrl:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js",
  };
}

function squareBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

type SquareError = { detail?: string; code?: string };
type Money = { amount?: number; currency?: string };

type SquareCheckoutResponse = {
  payment_link?: {
    id?: string;
    order_id?: string;
    url?: string;
    long_url?: string;
  };
  errors?: SquareError[];
};

type SquareOrder = {
  id?: string;
  version?: number;
  reference_id?: string;
  state?: string;
  created_at?: string;
  total_money?: Money;
  line_items?: Array<{
    name?: string;
    variation_name?: string;
    quantity?: string;
    note?: string;
    modifiers?: Array<{ name?: string; quantity?: string }>;
    total_money?: Money;
  }>;
  fulfillments?: Array<{
    type?: string;
    state?: string;
    pickup_details?: {
      recipient?: {
        display_name?: string;
        phone_number?: string;
        email_address?: string;
      };
      note?: string;
    };
  }>;
};

type SquarePayment = {
  id?: string;
  status?: string;
  order_id?: string;
  reference_id?: string;
  created_at?: string;
  updated_at?: string;
  delayed_until?: string;
  amount_money?: Money;
  card_details?: { card?: { card_brand?: string; last_4?: string } };
};

type SquareCreateOrderResponse = { order?: SquareOrder; errors?: SquareError[] };
type SquareCalculateOrderResponse = { order?: SquareOrder; errors?: SquareError[] };
type SquareCreatePaymentResponse = { payment?: SquarePayment; errors?: SquareError[] };
type SquareListPaymentsResponse = { payments?: SquarePayment[]; errors?: SquareError[] };
type SquareBatchOrdersResponse = { orders?: SquareOrder[]; errors?: SquareError[] };
type SquareRetrieveOrderResponse = { order?: SquareOrder; errors?: SquareError[] };

function squareErrorDetail(errors?: SquareError[]) {
  return errors?.map((error) => error.detail || error.code).filter(Boolean).join(" ");
}

async function squareApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Square access token is missing.");

  const response = await fetch(`${squareBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_API_VERSION || DEFAULT_SQUARE_API_VERSION,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const result = (await response.json()) as T & { errors?: SquareError[] };
  if (!response.ok) {
    throw new Error(squareErrorDetail(result.errors) || `Square request failed with status ${response.status}.`);
  }
  return result;
}

function pickupPrepMinutes() {
  const configured = Number(process.env.SQUARE_PICKUP_PREP_TIME_MINUTES || "20");
  return Number.isFinite(configured) ? Math.min(240, Math.max(1, Math.round(configured))) : 20;
}

function pickupPrepDuration() {
  return `PT${pickupPrepMinutes()}M`;
}

function approvalTimeoutMinutes() {
  const configured = Number(process.env.SQUARE_APPROVAL_TIMEOUT_MINUTES || "15");
  return Number.isFinite(configured) ? Math.min(120, Math.max(1, Math.round(configured))) : 15;
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

function squareLineItems(order: PreparedOrder) {
  return order.items.map((line) => ({
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
    ...(line.selectionLabels.length ? { note: line.selectionLabels.join(" · ").slice(0, 500) } : {}),
  }));
}

function squareOrderBody(order: PreparedOrder) {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square location ID is missing.");
  return {
    location_id: locationId,
    reference_id: order.orderNumber,
    source: { name: "HH Website" },
    line_items: squareLineItems(order),
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
  };
}

export async function calculateSquareOrderTotal(order: PreparedOrder) {
  const result = await squareApi<SquareCalculateOrderResponse>("/v2/orders/calculate", {
    method: "POST",
    body: JSON.stringify({ order: squareOrderBody(order) }),
  });
  const amount = result.order?.total_money?.amount;
  if (!Number.isInteger(amount) || Number(amount) <= 0) {
    throw new Error("Square could not calculate the final order total.");
  }
  return Number(amount);
}

async function createSquareOrder(order: PreparedOrder) {
  const result = await squareApi<SquareCreateOrderResponse>("/v2/orders", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `${order.idempotencyKey}-order`,
      order: squareOrderBody(order),
    }),
  });
  const squareOrder = result.order;
  const amount = squareOrder?.total_money?.amount;
  if (!squareOrder?.id || !Number.isInteger(amount) || Number(amount) <= 0) {
    throw new Error("Square could not create the order.");
  }
  return { order: squareOrder, totalCents: Number(amount) };
}

async function cancelSquareOrder(orderId: string) {
  try {
    const retrieved = await squareApi<SquareRetrieveOrderResponse>(`/v2/orders/${encodeURIComponent(orderId)}`);
    const order = retrieved.order;
    if (!order?.id || order.state === "CANCELED" || order.state === "COMPLETED") return;
    await squareApi(`/v2/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: JSON.stringify({
        idempotency_key: `cancel-${orderId}`.slice(0, 192),
        order: {
          id: orderId,
          location_id: process.env.SQUARE_LOCATION_ID,
          version: order.version,
          state: "CANCELED",
        },
      }),
    });
  } catch (error) {
    console.error("Square order cleanup failed", error);
  }
}

export async function createSquareApproval(
  order: PreparedOrder,
  sourceId: string,
  expectedTotalCents: number,
) {
  if (!squareApprovalConfigured()) {
    throw new Error("Order approval payments are not connected yet.");
  }
  if (!sourceId) throw new Error("Payment details are required.");

  const created = await createSquareOrder(order);
  if (created.totalCents !== expectedTotalCents) {
    await cancelSquareOrder(created.order.id!);
    throw new Error("The order total changed while you were checking out. Please review the order and try again.");
  }

  try {
    const result = await squareApi<SquareCreatePaymentResponse>("/v2/payments", {
      method: "POST",
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${order.idempotencyKey}-payment`,
        amount_money: { amount: created.totalCents, currency: "USD" },
        autocomplete: false,
        delay_duration: `PT${approvalTimeoutMinutes()}M`,
        delay_action: "CANCEL",
        location_id: process.env.SQUARE_LOCATION_ID,
        order_id: created.order.id,
        reference_id: order.orderNumber,
        note: `${order.orderNumber} · awaiting Happy Hearts approval`.slice(0, 500),
      }),
    });
    if (!result.payment?.id || result.payment.status !== "APPROVED") {
      await cancelSquareOrder(created.order.id!);
      throw new Error("Square could not authorize the card for approval.");
    }
    return {
      orderNumber: order.orderNumber,
      squareOrderId: created.order.id!,
      paymentId: result.payment.id,
      totalCents: created.totalCents,
      delayedUntil: result.payment.delayed_until ?? null,
    };
  } catch (error) {
    await cancelSquareOrder(created.order.id!);
    throw error;
  }
}

export type PendingApprovalOrder = {
  orderNumber: string;
  squareOrderId: string;
  paymentId: string;
  totalCents: number;
  createdAt: string | null;
  delayedUntil: string | null;
  customerName: string;
  phone: string;
  email: string;
  pickupNote: string;
  cardLabel: string;
  items: Array<{
    name: string;
    variationName: string;
    quantity: string;
    modifiers: string[];
    note: string;
  }>;
};

export async function listPendingApprovalOrders(): Promise<PendingApprovalOrder[]> {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("Square location ID is missing.");
  const begin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    begin_time: begin,
    location_id: locationId,
    sort_order: "DESC",
    limit: "100",
  });
  const paymentsResult = await squareApi<SquareListPaymentsResponse>(`/v2/payments?${params}`);
  const payments = (paymentsResult.payments ?? []).filter(
    (payment) =>
      payment.status === "APPROVED" &&
      Boolean(payment.id && payment.order_id) &&
      Boolean(payment.reference_id?.startsWith("HH-")),
  );
  const orderIds = [...new Set(payments.map((payment) => payment.order_id!).filter(Boolean))];
  if (!orderIds.length) return [];

  const ordersResult = await squareApi<SquareBatchOrdersResponse>("/v2/orders/batch-retrieve", {
    method: "POST",
    body: JSON.stringify({ location_id: locationId, order_ids: orderIds }),
  });
  const ordersById = new Map((ordersResult.orders ?? []).filter((order) => order.id).map((order) => [order.id!, order]));

  return payments.flatMap((payment) => {
    const order = ordersById.get(payment.order_id!);
    if (!order?.id || order.state === "CANCELED" || order.state === "COMPLETED") return [];
    const pickup = order.fulfillments?.find((fulfillment) => fulfillment.type === "PICKUP")?.pickup_details;
    const recipient = pickup?.recipient;
    const brand = payment.card_details?.card?.card_brand;
    const last4 = payment.card_details?.card?.last_4;
    return [{
      orderNumber: order.reference_id || payment.reference_id || "Website order",
      squareOrderId: order.id,
      paymentId: payment.id!,
      totalCents: Number(payment.amount_money?.amount || order.total_money?.amount || 0),
      createdAt: payment.created_at ?? order.created_at ?? null,
      delayedUntil: payment.delayed_until ?? null,
      customerName: recipient?.display_name || "Customer",
      phone: recipient?.phone_number || "",
      email: recipient?.email_address || "",
      pickupNote: pickup?.note || "",
      cardLabel: brand && last4 ? `${brand} •••• ${last4}` : "Card authorized",
      items: (order.line_items ?? []).map((line) => ({
        name: line.name || "Item",
        variationName: line.variation_name || "",
        quantity: line.quantity || "1",
        modifiers: (line.modifiers ?? [])
          .map((modifier) => `${modifier.name || "Modifier"}${modifier.quantity && modifier.quantity !== "1" ? ` ×${modifier.quantity}` : ""}`),
        note: line.note || "",
      })),
    }];
  });
}

export async function acceptPendingApproval(squareOrderId: string, paymentId: string) {
  const result = await squareApi<{ order?: SquareOrder; errors?: SquareError[] }>(
    `/v2/orders/${encodeURIComponent(squareOrderId)}/pay`,
    {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: `accept-${paymentId}`.slice(0, 192),
        payment_ids: [paymentId],
      }),
    },
  );
  return result.order;
}

export async function declinePendingApproval(squareOrderId: string, paymentId: string) {
  await squareApi(`/v2/payments/${encodeURIComponent(paymentId)}/cancel`, { method: "POST" });
  await cancelSquareOrder(squareOrderId);
}

export async function cleanupCanceledWebsiteOrder(orderId: string) {
  await cancelSquareOrder(orderId);
}

export async function createSquareCheckout(order: PreparedOrder) {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) {
    throw new Error("Square checkout is not connected yet.");
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const lineItems = squareLineItems(order);

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
      order: squareOrderBody(order),
      checkout_options: {
        redirect_url: `${siteUrl}/order?payment=return&order=${encodeURIComponent(order.orderNumber)}`,
      },
    }),
    cache: "no-store",
  });

  const result = (await response.json()) as SquareCheckoutResponse;
  if (!response.ok || !result.payment_link?.url || !result.payment_link.order_id) {
    const details = squareErrorDetail(result.errors);
    console.error("Square checkout error", response.status, result);
    throw new Error(details || "Square checkout could not be opened. Please call 501-613-1513.");
  }

  return {
    checkoutUrl: result.payment_link.url,
    paymentLinkId: result.payment_link.id ?? null,
    squareOrderId: result.payment_link.order_id,
  };
}
