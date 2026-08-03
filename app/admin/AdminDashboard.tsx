"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/menu";
import type { OrderStatus, StoredOrder } from "@/lib/orders";

const statuses: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

function prettyStatus(status: OrderStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function prettyPayment(status: StoredOrder["payment_status"]) {
  return status === "not_required"
    ? "Pay after confirmation"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDashboard() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (response.status === 401) {
        setAuthorized(false);
        setOrders([]);
        return;
      }
      const result = (await response.json()) as {
        ok: boolean;
        orders?: StoredOrder[];
        error?: string;
      };
      if (!response.ok || !result.ok || !result.orders) {
        throw new Error(result.error || "Orders could not be loaded.");
      }
      setOrders(result.orders);
      setAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Login failed.");
      setPassword("");
      await loadOrders();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
      setAuthorized(false);
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthorized(false);
    setOrders([]);
  }

  async function updateStatus(id: string, status: OrderStatus) {
    setError("");
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = (await response.json()) as {
      ok: boolean;
      order?: StoredOrder;
      error?: string;
    };
    if (!response.ok || !result.ok || !result.order) {
      setError(result.error || "Order could not be updated.");
      return;
    }
    setOrders((current) =>
      current.map((order) => (order.id === result.order?.id ? result.order : order)),
    );
  }

  if (authorized === false) {
    return (
      <div className="admin-login">
        <h1>Orders</h1>
        <p>Enter the private dashboard password to view and update incoming orders.</p>
        <form onSubmit={login}>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-label="Admin password"
          />
          <button className="admin-button" type="submit" disabled={loading}>
            {loading ? "Checking…" : "Open dashboard"}
          </button>
        </form>
        {error ? <p className="checkout-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="section-label">PRIVATE DASHBOARD</p>
          <h1>Incoming orders</h1>
        </div>
        <div className="admin-topbar-actions">
          <button className="admin-button" type="button" onClick={() => void loadOrders()}>
            Refresh
          </button>
          <button className="admin-button" type="button" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </div>

      {error ? <p className="checkout-error">{error}</p> : null}
      {loading && authorized === null ? <p>Loading orders…</p> : null}

      <div className="admin-orders">
        {!loading && orders.length === 0 ? <p>No orders have been submitted yet.</p> : null}
        {orders.map((order) => (
          <article className="admin-order" key={order.id}>
            <header className="admin-order-header">
              <div>
                <h2>{order.order_number}</h2>
                <p>
                  {displayDate(order.created_at)} · {prettyStatus(order.status)} · {prettyPayment(order.payment_status)}
                </p>
              </div>
              <span className="admin-order-total">{formatMoney(order.total_cents)}</span>
            </header>

            <div className="admin-order-body">
              <div>
                <p><strong>{order.customer_name}</strong></p>
                <p><a href={`tel:${order.phone}`}>{order.phone}</a></p>
                {order.email ? <p><a href={`mailto:${order.email}`}>{order.email}</a></p> : null}
                <p><strong>Fulfillment:</strong> {order.fulfillment}</p>
                <p><strong>Payment:</strong> {order.payment_method === "square" ? "Square" : "After confirmation"} · {prettyPayment(order.payment_status)}</p>
                {order.address ? <p><strong>Address:</strong> {order.address}</p> : null}
                {order.requested_time ? (
                  <p><strong>Requested time:</strong> {order.requested_time}</p>
                ) : null}
                {order.notes ? <p><strong>Notes:</strong> {order.notes}</p> : null}
              </div>

              <ul className="admin-item-list">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${item.itemId}-${index}`}>
                    <strong>
                      {item.quantity} × {item.name}{item.variationName ? ` · ${item.variationName}` : ""}
                    </strong>{" "}
                    <span>{formatMoney(item.lineTotalCents)}</span>
                    {item.selections.map((selection) => (
                      <small key={selection}>{selection}</small>
                    ))}
                  </li>
                ))}
              </ul>
            </div>

            <footer className="admin-order-footer">
              <label htmlFor={`status-${order.id}`}>Status</label>
              <select
                id={`status-${order.id}`}
                value={order.status}
                onChange={(event) =>
                  void updateStatus(order.id, event.target.value as OrderStatus)
                }
              >
                {statuses.map((status) => (
                  <option value={status} key={status}>
                    {prettyStatus(status)}
                  </option>
                ))}
              </select>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
