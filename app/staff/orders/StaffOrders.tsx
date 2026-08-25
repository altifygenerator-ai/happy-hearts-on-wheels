"use client";

import { useEffect, useRef, useState } from "react";

type PendingOrder = {
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

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function localTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function chime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
  } catch {
    // Alerts are a convenience; order polling continues if audio is unavailable.
  }
}

export function StaffOrders() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const initialized = useRef(false);
  const previousIds = useRef(new Set<string>());

  async function refresh() {
    try {
      const response = await fetch("/api/staff/orders", { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; orders?: PendingOrder[]; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Orders could not be loaded.");
      const nextOrders = result.orders ?? [];
      if (initialized.current) {
        const newOrders = nextOrders.filter((order) => !previousIds.current.has(order.paymentId));
        if (newOrders.length) {
          chime();
          if (alertsEnabled && "Notification" in window && Notification.permission === "granted") {
            const first = newOrders[0];
            new Notification("New Happy Hearts order", {
              body: `${money(first.totalCents)} · ${first.customerName} · waiting for approval`,
            });
          }
        }
      }
      previousIds.current = new Set(nextOrders.map((order) => order.paymentId));
      initialized.current = true;
      setOrders(nextOrders);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, [alertsEnabled]);

  async function enableAlerts() {
    if (!("Notification" in window)) {
      setAlertsEnabled(true);
      chime();
      return;
    }
    const permission = await Notification.requestPermission();
    setAlertsEnabled(permission === "granted");
    chime();
  }

  async function act(order: PendingOrder, action: "accept" | "decline") {
    const question = action === "accept"
      ? `Accept ${order.orderNumber} and capture ${money(order.totalCents)}?`
      : `Decline ${order.orderNumber} and release the card authorization?`;
    if (!window.confirm(question)) return;
    setBusyId(order.paymentId);
    setError("");
    try {
      const response = await fetch(`/api/staff/orders/${encodeURIComponent(order.squareOrderId)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: order.paymentId }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || `Order could not be ${action}ed.`);
      setOrders((current) => current.filter((candidate) => candidate.paymentId !== order.paymentId));
      previousIds.current.delete(order.paymentId);
      window.setTimeout(refresh, 1200);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The order could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="staff-orders-app">
      <div className="staff-toolbar">
        <div>
          <p>LIVE APPROVAL QUEUE</p>
          <h1>Website Orders</h1>
          <small>Accepting an order captures the authorized card. Square should then send the paid pickup order into the normal order and printer workflow.</small>
        </div>
        <div className="staff-toolbar-actions">
          <button type="button" onClick={enableAlerts}>{alertsEnabled ? "Alerts enabled" : "Enable alerts"}</button>
          <button type="button" onClick={() => void refresh()}>Refresh</button>
          <form action="/api/staff/logout" method="post"><button type="submit">Log out</button></form>
        </div>
      </div>

      {error ? <p className="staff-error" role="alert">{error}</p> : null}
      {loading ? <p className="staff-empty">Checking Square for pending orders…</p> : null}
      {!loading && !orders.length ? <p className="staff-empty">No website orders are waiting for approval.</p> : null}

      <div className="staff-order-list">
        {orders.map((order) => (
          <article className="staff-order-card" key={order.paymentId}>
            <div className="staff-order-head">
              <div>
                <small>{order.orderNumber}{order.createdAt ? ` · ${localTime(order.createdAt)}` : ""}</small>
                <h2>{order.customerName}</h2>
                <p>{order.phone}{order.email ? ` · ${order.email}` : ""}</p>
              </div>
              <strong>{money(order.totalCents)}</strong>
            </div>

            <details>
              <summary>{order.items.length} item{order.items.length === 1 ? "" : "s"} · View order details</summary>
              <div className="staff-order-items">
                {order.items.map((item, index) => (
                  <div className="staff-order-item" key={`${order.paymentId}-${index}`}>
                    <strong>{item.quantity}× {item.name}{item.variationName ? ` · ${item.variationName}` : ""}</strong>
                    {item.modifiers.length ? <p>{item.modifiers.join(" · ")}</p> : null}
                    {item.note ? <small>{item.note}</small> : null}
                  </div>
                ))}
                {order.pickupNote ? <p className="staff-pickup-note">{order.pickupNote}</p> : null}
                <p className="staff-card-note">{order.cardLabel}{order.delayedUntil ? ` · Authorization expires ${localTime(order.delayedUntil)}` : ""}</p>
              </div>
            </details>

            <div className="staff-order-actions">
              <button
                className="staff-decline"
                type="button"
                disabled={busyId === order.paymentId}
                onClick={() => void act(order, "decline")}
              >
                Decline
              </button>
              <button
                className="staff-accept"
                type="button"
                disabled={busyId === order.paymentId}
                onClick={() => void act(order, "accept")}
              >
                {busyId === order.paymentId ? "Working…" : "Accept & charge"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
