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

type OrderingControl = {
  manualPause: {
    paused: boolean;
    until: string | null;
    updatedAt: string | null;
  };
  heartbeatAt: string | null;
  heartbeatFresh: boolean;
  heartbeatAgeSeconds: number | null;
  heartbeatTtlSeconds: number;
  controlAvailable: boolean;
  warning?: string;
};

type OrderingStatus = {
  canOrder: boolean;
  isOpen: boolean;
  reason: "open" | "closed" | "prep-cutoff" | "manual-pause" | "staff-offline" | "unavailable";
  message: string;
  hoursSource: "square" | "site-fallback";
  manualPaused: boolean;
  manualPauseUntil: string | null;
  staffHeartbeatRequired: boolean;
  staffHeartbeatFresh: boolean;
};

type ControlResponse = {
  ok: boolean;
  control?: OrderingControl;
  status?: OrderingStatus;
  error?: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function localTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
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
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.6);
    navigator.vibrate?.([180, 90, 180]);
  } catch {
    // Polling and the automatic kitchen-online safety check continue if audio is unavailable.
  }
}

export function StaffOrders() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [control, setControl] = useState<OrderingControl | null>(null);
  const [orderingStatus, setOrderingStatus] = useState<OrderingStatus | null>(null);
  const [controlBusy, setControlBusy] = useState(false);
  const [pauseMinutes, setPauseMinutes] = useState("manual");
  const initialized = useRef(false);
  const previousIds = useRef(new Set<string>());
  const wakeLock = useRef<{ release?: () => Promise<void> | void } | null>(null);

  async function refreshOrders() {
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
            new Notification("NEW HAPPY HEARTS ORDER", {
              body: `${money(first.totalCents)} · ${first.customerName} · waiting for approval`,
              requireInteraction: true,
            });
          }
        }
      }
      previousIds.current = new Set(nextOrders.map((order) => order.paymentId));
      initialized.current = true;
      setOrders(nextOrders);
      setError("");
      document.title = nextOrders.length ? `(${nextOrders.length}) Website Orders · Happy Hearts` : "Website Orders · Happy Hearts";
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshControl() {
    try {
      const response = await fetch("/api/staff/ordering-control", { cache: "no-store" });
      const result = (await response.json()) as ControlResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "Ordering status could not be loaded.");
      if (result.control) setControl(result.control);
      if (result.status) setOrderingStatus(result.status);
      setConnectionError("");
    } catch (controlError) {
      setConnectionError(controlError instanceof Error ? controlError.message : "Ordering status could not be loaded.");
    }
  }

  async function heartbeat() {
    try {
      const response = await fetch("/api/staff/heartbeat", { method: "POST", cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Kitchen connection could not be updated.");
      setConnectionError("");
      await refreshControl();
    } catch (heartbeatError) {
      setConnectionError(heartbeatError instanceof Error ? heartbeatError.message : "Kitchen connection could not be updated.");
    }
  }

  useEffect(() => {
    void heartbeat();
    void refreshControl();
    void refreshOrders();

    const ordersTimer = window.setInterval(refreshOrders, 8_000);
    const heartbeatTimer = window.setInterval(heartbeat, 60_000);
    const controlTimer = window.setInterval(refreshControl, 20_000);
    const reminderTimer = window.setInterval(() => {
      if (alertsEnabled && orders.length) chime();
    }, 25_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void heartbeat();
        void refreshOrders();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(ordersTimer);
      window.clearInterval(heartbeatTimer);
      window.clearInterval(controlTimer);
      window.clearInterval(reminderTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      document.title = "Website Orders · Happy Hearts";
      void wakeLock.current?.release?.();
    };
  }, [alertsEnabled, orders.length]);

  async function enableAlerts() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setAlertsEnabled(permission === "granted");
    } else {
      setAlertsEnabled(true);
    }

    try {
      const typedNavigator = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release?: () => Promise<void> | void }> };
      };
      if (typedNavigator.wakeLock) {
        wakeLock.current = await typedNavigator.wakeLock.request("screen");
      }
    } catch {
      // Some devices do not support screen wake lock; heartbeat safety still protects ordering.
    }
    chime();
  }

  async function updateOrdering(action: "pause" | "resume") {
    setControlBusy(true);
    setError("");
    try {
      const minutes = pauseMinutes === "manual" ? null : Number(pauseMinutes);
      const response = await fetch("/api/staff/ordering-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "pause" ? { action, minutes } : { action }),
      });
      const result = (await response.json()) as ControlResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "Online ordering could not be updated.");
      if (result.control) setControl(result.control);
      if (result.status) setOrderingStatus(result.status);
      setConnectionError("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Online ordering could not be updated.");
    } finally {
      setControlBusy(false);
    }
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
      window.setTimeout(refreshOrders, 1200);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The order could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  const manuallyPaused = Boolean(control?.manualPause.paused);
  const orderingLive = Boolean(orderingStatus?.canOrder);

  return (
    <div className="staff-orders-app">
      <section className={`staff-ordering-control ${orderingLive ? "staff-ordering-live" : "staff-ordering-stopped"}`}>
        <div className="staff-ordering-state">
          <span className="staff-ordering-light" aria-hidden="true" />
          <div>
            <p>WEBSITE PICKUP ORDERING</p>
            <h2>{orderingLive ? "Orders are ON" : manuallyPaused ? "Orders are PAUSED" : "Orders are OFF"}</h2>
            <small>{orderingStatus?.message || "Checking the website ordering connection…"}</small>
          </div>
        </div>

        <div className="staff-ordering-controls">
          {manuallyPaused ? (
            <button
              className="staff-resume-orders"
              type="button"
              disabled={controlBusy}
              onClick={() => void updateOrdering("resume")}
            >
              {controlBusy ? "Updating…" : "Turn online orders back on"}
            </button>
          ) : (
            <>
              <label>
                Pause for
                <select value={pauseMinutes} onChange={(event) => setPauseMinutes(event.target.value)} disabled={controlBusy}>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                  <option value="480">8 hours</option>
                  <option value="1440">24 hours</option>
                  <option value="2880">48 hours</option>
                  <option value="manual">Until I turn them back on</option>
                </select>
              </label>
              <button
                className="staff-pause-orders"
                type="button"
                disabled={controlBusy}
                onClick={() => void updateOrdering("pause")}
              >
                {controlBusy ? "Updating…" : "Pause online orders"}
              </button>
            </>
          )}
        </div>

        <div className="staff-ordering-footnote">
          <strong>Safety:</strong> approval-mode ordering only stays open while this staff screen is actively connected. If this screen closes, loses internet, or stops checking in, the website automatically stops accepting new orders within a few minutes.
          {control?.manualPause.until ? <span> Timed pause ends {localDateTime(control.manualPause.until)}.</span> : null}
          {orderingStatus?.hoursSource === "site-fallback" ? <span> Regular hours fallback: Fri–Tue, 11 AM–7 PM.</span> : <span> Regular hours are being read from Square.</span>}
          <span> Kitchen screen: {control?.heartbeatFresh ? "connected" : "not connected"}{control?.heartbeatAt ? ` · last check-in ${localTime(control.heartbeatAt)}` : ""}.</span>
        </div>
      </section>

      <div className="staff-toolbar">
        <div>
          <p>LIVE APPROVAL QUEUE</p>
          <h1>Website Orders {orders.length ? `(${orders.length})` : ""}</h1>
          <small>Keep this screen open while accepting website orders. Accepting captures the authorized card and sends the paid pickup order into the Square workflow.</small>
        </div>
        <div className="staff-toolbar-actions">
          <button type="button" onClick={enableAlerts}>{alertsEnabled ? "Alerts + screen awake" : "Enable alerts + keep awake"}</button>
          <button type="button" onClick={() => void refreshOrders()}>Refresh</button>
          <form action="/api/staff/logout" method="post"><button type="submit">Log out</button></form>
        </div>
      </div>

      {connectionError ? <p className="staff-error" role="alert"><strong>Kitchen connection:</strong> {connectionError}</p> : null}
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

            <details open>
              <summary>{order.items.length} item{order.items.length === 1 ? "" : "s"} · Order details</summary>
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
