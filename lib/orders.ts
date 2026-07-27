import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { priceMenuItem, type SelectionInput } from "@/lib/menu";

export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentMethod = "pay_later" | "square";
export type PaymentStatus = "not_required" | "pending" | "paid" | "failed" | "cancelled";

export type OrderLineInput = {
  itemId: string;
  quantity: number;
  selections?: SelectionInput[];
};

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  fulfillment: "pickup" | "delivery";
  address?: string;
  requestedTime?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  items: OrderLineInput[];
};

export type StoredOrderLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  selections: string[];
};

export type StoredOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  fulfillment: "pickup" | "delivery";
  address: string | null;
  requested_time: string | null;
  notes: string | null;
  items: StoredOrderLine[];
  subtotal_cents: number;
  total_cents: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  square_payment_link_id: string | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  created_at: string;
};

const validStatuses: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

function requireText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value.trim().slice(0, maxLength);
}

function makeOrderNumber() {
  const date = new Date();
  const datePart = `${String(date.getFullYear()).slice(-2)}${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `HH-${datePart}-${randomPart}`;
}

export function normalizeOrderInput(raw: unknown): CreateOrderInput {
  if (!raw || typeof raw !== "object") throw new Error("Invalid order.");
  const value = raw as Record<string, unknown>;
  const fulfillment = value.fulfillment;
  if (fulfillment !== "pickup" && fulfillment !== "delivery") {
    throw new Error("Choose pickup or delivery.");
  }

  const paymentMethod = value.paymentMethod === "square" ? "square" : "pay_later";
  if (paymentMethod === "square" && fulfillment === "delivery") {
    throw new Error("Delivery requests are paid after Happy Hearts confirms the delivery fee.");
  }

  const rawItems = Array.isArray(value.items) ? value.items : [];
  if (rawItems.length === 0) throw new Error("Your order is empty.");
  if (rawItems.length > 40) throw new Error("That order is too large to submit online.");

  const items: OrderLineInput[] = rawItems.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") throw new Error("Invalid order item.");
    const item = rawItem as Record<string, unknown>;
    const itemId = requireText(item.itemId, "Menu item", 80);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error("Invalid item quantity.");
    }

    const selections: SelectionInput[] = Array.isArray(item.selections)
      ? item.selections.map((rawSelection) => {
          if (!rawSelection || typeof rawSelection !== "object") {
            throw new Error("Invalid menu choice.");
          }
          const selection = rawSelection as Record<string, unknown>;
          return {
            groupId: requireText(selection.groupId, "Choice group", 80),
            value: requireText(selection.value, "Choice", 80),
          };
        })
      : [];

    return { itemId, quantity, selections };
  });

  const address = optionalText(value.address, 300);
  if (fulfillment === "delivery" && !address) {
    throw new Error("Enter a delivery address.");
  }

  return {
    customerName: requireText(value.customerName, "Name", 120),
    phone: requireText(value.phone, "Phone", 40),
    email: optionalText(value.email, 160) ?? undefined,
    fulfillment,
    address: address ?? undefined,
    requestedTime: optionalText(value.requestedTime, 80) ?? undefined,
    notes: optionalText(value.notes, 800) ?? undefined,
    paymentMethod,
    items,
  };
}

function buildStoredOrder(input: CreateOrderInput): StoredOrder {
  const lines: StoredOrderLine[] = input.items.map((line) => {
    const priced = priceMenuItem(line.itemId, line.selections ?? []);
    return {
      itemId: line.itemId,
      name: priced.item.name,
      quantity: line.quantity,
      unitPriceCents: priced.totalCents,
      lineTotalCents: priced.totalCents * line.quantity,
      selections: priced.selectionLabels,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  if (subtotal <= 0) throw new Error("Invalid order total.");

  return {
    id: randomUUID(),
    order_number: makeOrderNumber(),
    customer_name: input.customerName,
    phone: input.phone,
    email: input.email ?? null,
    fulfillment: input.fulfillment,
    address: input.address ?? null,
    requested_time: input.requestedTime ?? null,
    notes: input.notes ?? null,
    items: lines,
    subtotal_cents: subtotal,
    total_cents: subtotal,
    status: "new",
    payment_method: input.paymentMethod,
    payment_status: input.paymentMethod === "square" ? "pending" : "not_required",
    square_payment_link_id: null,
    square_order_id: null,
    square_payment_id: null,
    created_at: new Date().toISOString(),
  };
}

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Order storage is not configured.");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${endpoint}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Supabase order error", response.status, details);
    throw new Error("The order could not be saved. Please call us instead.");
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

const localDataDir = path.join(process.cwd(), ".data");
const localDataFile = path.join(localDataDir, "orders.json");

function withPaymentDefaults(order: StoredOrder): StoredOrder {
  return {
    ...order,
    payment_method: order.payment_method ?? "pay_later",
    payment_status: order.payment_status ?? "not_required",
    square_payment_link_id: order.square_payment_link_id ?? null,
    square_order_id: order.square_order_id ?? null,
    square_payment_id: order.square_payment_id ?? null,
  };
}

async function readLocalOrders(): Promise<StoredOrder[]> {
  try {
    const raw = await fs.readFile(localDataFile, "utf8");
    return (JSON.parse(raw) as StoredOrder[]).map(withPaymentDefaults);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalOrders(orders: StoredOrder[]) {
  await fs.mkdir(localDataDir, { recursive: true });
  await fs.writeFile(localDataFile, JSON.stringify(orders, null, 2), "utf8");
}

export async function createOrder(input: CreateOrderInput) {
  const order = buildStoredOrder(input);

  if (supabaseConfigured()) {
    const [saved] = await supabaseRequest<StoredOrder[]>("orders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(order),
    });
    return withPaymentDefaults(saved ?? order);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Online ordering is not connected yet. Please call 501-613-1513.");
  }

  const orders = await readLocalOrders();
  orders.unshift(order);
  await writeLocalOrders(orders);
  return order;
}

export async function listOrders(): Promise<StoredOrder[]> {
  if (supabaseConfigured()) {
    const orders = await supabaseRequest<StoredOrder[]>(
      "orders?select=*&order=created_at.desc&limit=250",
    );
    return orders.map(withPaymentDefaults);
  }
  return readLocalOrders();
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!validStatuses.includes(status)) throw new Error("Invalid order status.");

  if (supabaseConfigured()) {
    const encodedId = encodeURIComponent(id);
    const [updated] = await supabaseRequest<StoredOrder[]>(`orders?id=eq.${encodedId}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    });
    if (!updated) throw new Error("Order not found.");
    return withPaymentDefaults(updated);
  }

  const orders = await readLocalOrders();
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) throw new Error("Order not found.");
  orders[index] = { ...orders[index], status };
  await writeLocalOrders(orders);
  return orders[index];
}

type PaymentUpdate = Partial<
  Pick<
    StoredOrder,
    | "payment_status"
    | "square_payment_link_id"
    | "square_order_id"
    | "square_payment_id"
  >
>;

export async function updateOrderPayment(id: string, update: PaymentUpdate) {
  if (supabaseConfigured()) {
    const encodedId = encodeURIComponent(id);
    const [updated] = await supabaseRequest<StoredOrder[]>(`orders?id=eq.${encodedId}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(update),
    });
    if (!updated) throw new Error("Order not found.");
    return withPaymentDefaults(updated);
  }

  const orders = await readLocalOrders();
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) throw new Error("Order not found.");
  orders[index] = { ...orders[index], ...update };
  await writeLocalOrders(orders);
  return orders[index];
}

export async function updateOrderPaymentBySquareOrderId(
  squareOrderId: string,
  update: PaymentUpdate,
) {
  if (supabaseConfigured()) {
    const encodedId = encodeURIComponent(squareOrderId);
    const [updated] = await supabaseRequest<StoredOrder[]>(
      `orders?square_order_id=eq.${encodedId}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(update),
      },
    );
    return updated ? withPaymentDefaults(updated) : null;
  }

  const orders = await readLocalOrders();
  const index = orders.findIndex((order) => order.square_order_id === squareOrderId);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...update };
  await writeLocalOrders(orders);
  return orders[index];
}
