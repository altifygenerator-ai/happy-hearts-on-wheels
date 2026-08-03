import { formatMoney } from "@/lib/menu";
import type { StoredOrder } from "@/lib/orders";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character,
  );
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL;
  if (!apiKey || !from) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    console.error("Order email notification failed", response.status, await response.text());
  }
}

function orderItemsHtml(order: StoredOrder) {
  return order.items
    .map((item) => {
      const selections = item.selections.length
        ? `<ul>${item.selections.map((selection) => `<li>${escapeHtml(selection)}</li>`).join("")}</ul>`
        : "";
      return `<li><strong>${item.quantity} × ${escapeHtml(item.name)}${item.variationName ? ` · ${escapeHtml(item.variationName)}` : ""}</strong> — ${formatMoney(
        item.lineTotalCents,
      )}${selections}</li>`;
    })
    .join("");
}

export async function sendOrderNotifications(order: StoredOrder) {
  const ownerEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  const ownerHtml = `
    <h1>New Happy Hearts order: ${escapeHtml(order.order_number)}</h1>
    <p><strong>${escapeHtml(order.customer_name)}</strong><br>${escapeHtml(order.phone)}</p>
    <p><strong>Fulfillment:</strong> ${escapeHtml(order.fulfillment)}</p>
    <p><strong>Payment:</strong> ${order.payment_method === "square" ? `Square — ${escapeHtml(order.payment_status)}` : "Pay after confirmation"}</p>
    ${order.address ? `<p><strong>Address:</strong> ${escapeHtml(order.address)}</p>` : ""}
    ${order.requested_time ? `<p><strong>Requested time:</strong> ${escapeHtml(order.requested_time)}</p>` : ""}
    ${order.notes ? `<p><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
    <h2>Items</h2>
    <ol>${orderItemsHtml(order)}</ol>
    <p><strong>Total:</strong> ${formatMoney(order.total_cents)}</p>
    <p>Open the private order dashboard to accept and update this order.</p>
  `;

  const tasks: Promise<void>[] = [];
  if (ownerEmail) {
    tasks.push(sendEmail(ownerEmail, `New order ${order.order_number}`, ownerHtml));
  }

  if (order.email) {
    const customerHtml = `
      <h1>We received your Happy Hearts order</h1>
      <p>Your order number is <strong>${escapeHtml(order.order_number)}</strong>.</p>
      <ol>${orderItemsHtml(order)}</ol>
      <p><strong>Total:</strong> ${formatMoney(order.total_cents)}</p>
      <p><strong>Payment:</strong> ${order.payment_method === "square" ? `Square — ${escapeHtml(order.payment_status)}` : "Pay after Happy Hearts confirms the order"}</p>
      <p>${order.payment_method === "square" ? "Happy Hearts will confirm the requested time by phone." : "Happy Hearts will confirm the order, requested time and any delivery details by phone before payment."} For immediate help, call 501-613-1513.</p>
    `;
    tasks.push(
      sendEmail(order.email, `Happy Hearts order ${order.order_number}`, customerHtml),
    );
  }

  await Promise.allSettled(tasks);
}
