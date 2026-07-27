"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  menuCategories,
  menuItems,
  priceMenuItem,
  type MenuItem,
  type SelectionInput,
} from "@/lib/menu";

type CartLine = {
  key: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  selections: SelectionInput[];
  selectionLabels: string[];
};

type PaymentMethod = "pay_later" | "square";

type CheckoutState = {
  customerName: string;
  phone: string;
  email: string;
  fulfillment: "pickup" | "delivery";
  address: string;
  requestedTime: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

const squareEnabled = process.env.NEXT_PUBLIC_SQUARE_ENABLED === "true";

const initialCheckout: CheckoutState = {
  customerName: "",
  phone: "",
  email: "",
  fulfillment: "pickup",
  address: "",
  requestedTime: "",
  notes: "",
  paymentMethod: "pay_later",
};

function cartKey(itemId: string, selections: SelectionInput[]) {
  const normalized = [...selections].sort((a, b) =>
    `${a.groupId}:${a.value}`.localeCompare(`${b.groupId}:${b.value}`),
  );
  return `${itemId}:${JSON.stringify(normalized)}`;
}

function CustomBuilder({ item, onAdd }: { item: MenuItem; onAdd: (line: CartLine) => void }) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [item.optionGroups?.[0]?.id ?? ""]: true,
  }));

  const selections = useMemo<SelectionInput[]>(
    () =>
      Object.entries(selected).flatMap(([groupId, values]) =>
        values.map((value) => ({ groupId, value })),
      ),
    [selected],
  );

  const price = useMemo(() => {
    try {
      return priceMenuItem(item.id, selections).totalCents;
    } catch {
      return item.priceCents;
    }
  }, [item, selections]);

  function toggle(groupId: string, value: string, checked: boolean, maxSelections?: number) {
    setSelected((current) => {
      const values = current[groupId] ?? [];
      let nextValues = checked ? [...values, value] : values.filter((entry) => entry !== value);
      if (checked && maxSelections === 1) nextValues = [value];
      if (checked && maxSelections && maxSelections > 1 && nextValues.length > maxSelections) {
        nextValues = nextValues.slice(-maxSelections);
      }
      return { ...current, [groupId]: nextValues };
    });
    setMessage("");
  }

  function addBuilderToCart() {
    try {
      const priced = priceMenuItem(item.id, selections);
      onAdd({
        key: cartKey(item.id, selections),
        itemId: item.id,
        name: item.name,
        quantity: 1,
        unitPriceCents: priced.totalCents,
        selections,
        selectionLabels: priced.selectionLabels,
      });
      setMessage("Added to your order.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please finish your choices.");
    }
  }

  return (
    <article className={`custom-builder builder-tone-${item.builderTone ?? "ocean"}`} id={item.id}>
      <div className="builder-top">
        <div>
          <p>MAKE IT YOURS</p>
          <h3>{item.name}</h3>
          {item.menuNote ? <small>{item.menuNote}</small> : null}
        </div>
        <strong>{formatMoney(price)}</strong>
      </div>

      <div className="builder-groups">
        {item.optionGroups?.map((group, index) => {
          const selectedCount = (selected[group.id] ?? []).length;
          return (
            <details
              className="builder-group"
              key={group.id}
              open={Boolean(openGroups[group.id])}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenGroups((current) => ({ ...current, [group.id]: isOpen }));
              }}
            >
              <summary>
                <span className="builder-step-number">{index + 1}</span>
                <span className="builder-summary-copy">
                  <strong>
                    {group.label}
                    {group.required ? " *" : ""}
                  </strong>
                  <small>
                    {group.help ??
                      (group.maxSelections
                        ? `Choose up to ${group.maxSelections}`
                        : "Choose any that sound good")}
                  </small>
                </span>
                <span className="builder-selection-count">
                  {selectedCount ? `${selectedCount} picked` : "Open"}
                </span>
              </summary>
              <div className="builder-options-wrap">
                <div className="option-checkboxes">
                  {group.options.map((option) => {
                    const checked = (selected[group.id] ?? []).includes(option.value);
                    return (
                      <label className={checked ? "option-selected" : ""} key={option.value}>
                        <input
                          type={group.maxSelections === 1 ? "radio" : "checkbox"}
                          name={`${item.id}-${group.id}`}
                          checked={checked}
                          onChange={(event) =>
                            toggle(group.id, option.value, event.target.checked, group.maxSelections)
                          }
                        />
                        <span>
                          {option.label}
                          {option.priceCents ? (
                            <span className="option-price"> +{formatMoney(option.priceCents)}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <div className="builder-footer">
        <p className="builder-message" aria-live="polite">
          {message}
        </p>
        <button className="builder-add-button" type="button" onClick={addBuilderToCart}>
          Add this build
        </button>
      </div>
    </article>
  );
}

export function OrderExperience() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkout, setCheckout] = useState<CheckoutState>(initialCheckout);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    orderNumber: string;
    totalCents: number;
    paymentMethod: PaymentMethod;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [squareReturn, setSquareReturn] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("happy-hearts-cart");
      if (stored) setCart(JSON.parse(stored) as CartLine[]);
      const params = new URLSearchParams(window.location.search);
      setSquareReturn(params.get("payment") === "return");
    } catch {
      window.localStorage.removeItem("happy-hearts-cart");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem("happy-hearts-cart", JSON.stringify(cart));
  }, [cart, loaded]);

  const totalCents = cart.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );

  function addLine(line: CartLine) {
    setSuccess(null);
    setCart((current) => {
      const existing = current.find((entry) => entry.key === line.key);
      if (!existing) return [...current, line];
      return current.map((entry) =>
        entry.key === line.key ? { ...entry, quantity: entry.quantity + 1 } : entry,
      );
    });
  }

  function addSimpleItem(item: MenuItem) {
    addLine({
      key: cartKey(item.id, []),
      itemId: item.id,
      name: item.name,
      quantity: 1,
      unitPriceCents: item.priceCents,
      selections: [],
      selectionLabels: [],
    });
  }

  function changeQuantity(key: string, amount: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + amount } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);
    if (cart.length === 0) {
      setError("Add at least one item before submitting the order.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...checkout,
          items: cart.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
            selections: line.selections,
          })),
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        order?: {
          orderNumber: string;
          totalCents: number;
          paymentMethod: PaymentMethod;
          checkoutUrl?: string;
        };
      };
      if (!response.ok || !result.ok || !result.order) {
        throw new Error(result.error || "The order could not be submitted.");
      }

      setCart([]);
      if (result.order.checkoutUrl) {
        window.localStorage.removeItem("happy-hearts-cart");
        window.location.assign(result.order.checkoutUrl);
        return;
      }

      setSuccess(result.order);
      setCheckout(initialCheckout);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The order could not be submitted. Please call 501-613-1513.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const customItems = menuItems.filter((item) => item.optionGroups?.length);
  const simpleCategories = menuCategories.filter((category) => category !== "Custom Favorites");

  return (
    <div className="order-layout">
      <div className="order-menu">
        {squareReturn ? (
          <div className="square-return-note">
            <span aria-hidden="true">♥</span>
            <p>
              Square sent you back to Happy Hearts. Your order and payment are being confirmed.
            </p>
          </div>
        ) : null}

        <div className="custom-builders-heading">
          <p>BUILD IT YOUR WAY</p>
          <h2>Open one section at a time, pick what sounds good, then add it to your order.</h2>
        </div>

        {customItems.map((item) => (
          <CustomBuilder item={item} key={item.id} onAdd={addLine} />
        ))}

        {simpleCategories.map((category) => {
          const categoryItems = menuItems.filter(
            (item) => item.category === category && !item.optionGroups?.length,
          );
          if (!categoryItems.length) return null;

          return (
            <section className="order-category" key={category}>
              <h2>{category}</h2>
              <div className="simple-item-list">
                {categoryItems.map((item) => (
                  <article className="order-item-row" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      {item.description ? <p>{item.description}</p> : null}
                    </div>
                    <strong>{formatMoney(item.priceCents)}</strong>
                    <button
                      className="add-item-button"
                      type="button"
                      onClick={() => addSimpleItem(item)}
                    >
                      Add
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="cart-panel" aria-label="Your order">
        <div className="cart-heading">
          <h2>Your Order</h2>
          <span>{formatMoney(totalCents)}</span>
        </div>

        {success ? (
          <div className="order-success">
            <p>ORDER RECEIVED</p>
            <h2>{success.orderNumber}</h2>
            <p>
              Total: <strong>{formatMoney(success.totalCents)}</strong>
            </p>
            <p>
              Happy Hearts will confirm the order at the phone number you entered. For anything
              urgent, call <a href="tel:+15016131513">501-613-1513</a>.
            </p>
          </div>
        ) : (
          <>
            {cart.length === 0 ? (
              <p className="empty-cart">
                Your order is empty. Add a regular menu item or build a custom salad, stir fry or
                smoothie.
              </p>
            ) : (
              <ul className="cart-lines">
                {cart.map((line) => (
                  <li className="cart-line" key={line.key}>
                    <div className="cart-line-head">
                      <strong>{line.name}</strong>
                      <span>{formatMoney(line.unitPriceCents * line.quantity)}</span>
                    </div>
                    {line.selectionLabels.length ? (
                      <ul>
                        {line.selectionLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="cart-line-controls">
                      <div className="quantity-controls">
                        <button
                          type="button"
                          aria-label={`Decrease ${line.name} quantity`}
                          onClick={() => changeQuantity(line.key, -1)}
                        >
                          −
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${line.name} quantity`}
                          onClick={() => changeQuantity(line.key, 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="remove-line"
                        onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form className="checkout-form" onSubmit={submitOrder}>
              <h3>Where should we send the confirmation?</h3>
              <div className="form-grid">
                <label>
                  Name *
                  <input
                    required
                    autoComplete="name"
                    value={checkout.customerName}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, customerName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Phone *
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={checkout.phone}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={checkout.email}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>

                <fieldset className="fulfillment-fieldset">
                  <legend>Pickup or delivery *</legend>
                  <div className="fulfillment-options">
                    <label>
                      <input
                        type="radio"
                        name="fulfillment"
                        value="pickup"
                        checked={checkout.fulfillment === "pickup"}
                        onChange={() =>
                          setCheckout((current) => ({ ...current, fulfillment: "pickup" }))
                        }
                      />
                      Pickup
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="fulfillment"
                        value="delivery"
                        checked={checkout.fulfillment === "delivery"}
                        onChange={() =>
                          setCheckout((current) => ({
                            ...current,
                            fulfillment: "delivery",
                            paymentMethod: "pay_later",
                          }))
                        }
                      />
                      Request delivery
                    </label>
                  </div>
                </fieldset>

                {checkout.fulfillment === "delivery" ? (
                  <label>
                    Delivery address *
                    <textarea
                      required
                      autoComplete="street-address"
                      value={checkout.address}
                      onChange={(event) =>
                        setCheckout((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </label>
                ) : null}

                <label>
                  Requested time
                  <input
                    placeholder="Example: Today around 5:30"
                    value={checkout.requestedTime}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, requestedTime: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Order notes or allergy information
                  <textarea
                    value={checkout.notes}
                    onChange={(event) =>
                      setCheckout((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>

                <fieldset className="payment-fieldset">
                  <legend>Payment</legend>
                  <div className="payment-options">
                    <label className={checkout.paymentMethod === "pay_later" ? "payment-selected" : ""}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="pay_later"
                        checked={checkout.paymentMethod === "pay_later"}
                        onChange={() =>
                          setCheckout((current) => ({ ...current, paymentMethod: "pay_later" }))
                        }
                      />
                      <span>
                        <strong>Pay after confirmation</strong>
                        <small>Best for delivery requests or paying at pickup.</small>
                      </span>
                    </label>
                    {squareEnabled && checkout.fulfillment === "pickup" ? (
                      <label className={checkout.paymentMethod === "square" ? "payment-selected" : ""}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="square"
                          checked={checkout.paymentMethod === "square"}
                          onChange={() =>
                            setCheckout((current) => ({ ...current, paymentMethod: "square" }))
                          }
                        />
                        <span>
                          <strong>Pay securely with Square</strong>
                          <small>You will finish payment on Square&apos;s secure checkout.</small>
                        </span>
                      </label>
                    ) : null}
                  </div>
                  {checkout.fulfillment === "delivery" ? (
                    <p className="payment-helper">
                      Delivery payment comes after Happy Hearts confirms availability and any fee.
                    </p>
                  ) : null}
                </fieldset>
              </div>

              <button className="checkout-submit" type="submit" disabled={submitting}>
                {submitting
                  ? checkout.paymentMethod === "square"
                    ? "Opening Square…"
                    : "Sending order…"
                  : checkout.paymentMethod === "square"
                    ? `Continue to Square · ${formatMoney(totalCents)}`
                    : `Submit order · ${formatMoney(totalCents)}`}
              </button>
              {error ? (
                <p className="checkout-error" role="alert">
                  {error}
                </p>
              ) : null}
              <p className="checkout-note">
                Happy Hearts confirms each order by phone. Delivery availability and any delivery
                fee are confirmed before payment.
              </p>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
