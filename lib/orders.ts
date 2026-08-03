import { randomUUID } from "node:crypto";
import { priceMenuItemFromCatalog, type SelectionInput } from "@/lib/menu";
import { getCheckoutCatalog } from "@/lib/square-catalog";

export type OrderLineInput = {
  itemId: string;
  variationId?: string;
  quantity: number;
  selections?: SelectionInput[];
};

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  requestedTime?: string;
  notes?: string;
  items: OrderLineInput[];
};

export type PreparedOrderLine = {
  name: string;
  variationName: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  selectionLabels: string[];
  squareVariationId: string;
  squareModifierIds: string[];
};

export type PreparedOrder = {
  idempotencyKey: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  requestedTime: string | null;
  notes: string | null;
  items: PreparedOrderLine[];
  subtotalCents: number;
};

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

  const rawItems = Array.isArray(value.items) ? value.items : [];
  if (rawItems.length === 0) throw new Error("Your order is empty.");
  if (rawItems.length > 40) throw new Error("That order is too large to submit online.");

  const items: OrderLineInput[] = rawItems.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") throw new Error("Invalid order item.");
    const item = rawItem as Record<string, unknown>;
    const itemId = requireText(item.itemId, "Menu item", 192);
    const variationId = optionalText(item.variationId, 192) ?? undefined;
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
            groupId: requireText(selection.groupId, "Choice group", 192),
            value: requireText(selection.value, "Choice", 192),
          };
        })
      : [];

    return { itemId, variationId, quantity, selections };
  });

  return {
    customerName: requireText(value.customerName, "Name", 120),
    phone: requireText(value.phone, "Phone", 40),
    email: optionalText(value.email, 160) ?? undefined,
    requestedTime: optionalText(value.requestedTime, 120) ?? undefined,
    notes: optionalText(value.notes, 800) ?? undefined,
    items,
  };
}

export async function prepareSquareOrder(input: CreateOrderInput): Promise<PreparedOrder> {
  // Always read Square fresh before checkout so a stale browser cannot order a sold-out item.
  const catalog = await getCheckoutCatalog();
  if (catalog.source !== "square") {
    throw new Error("Square ordering is not connected yet. Please call 501-613-1513.");
  }

  const items: PreparedOrderLine[] = input.items.map((line) => {
    const priced = priceMenuItemFromCatalog(
      catalog,
      line.itemId,
      line.variationId,
      line.selections ?? [],
    );

    if (!priced.variation.squareVariationId) {
      throw new Error(`${priced.item.name} is not connected to Square correctly.`);
    }

    const showVariation = (priced.item.variations?.length ?? 0) > 1;
    return {
      name: priced.item.name,
      variationName: showVariation ? priced.variation.name : null,
      quantity: line.quantity,
      unitPriceCents: priced.totalCents,
      lineTotalCents: priced.totalCents * line.quantity,
      selectionLabels: priced.selectionLabels,
      squareVariationId: priced.variation.squareVariationId,
      squareModifierIds: priced.squareModifierIds,
    };
  });

  const subtotalCents = items.reduce((sum, line) => sum + line.lineTotalCents, 0);
  if (subtotalCents <= 0) throw new Error("Invalid order total.");

  return {
    idempotencyKey: randomUUID(),
    orderNumber: makeOrderNumber(),
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? null,
    requestedTime: input.requestedTime ?? null,
    notes: input.notes ?? null,
    items,
    subtotalCents,
  };
}
