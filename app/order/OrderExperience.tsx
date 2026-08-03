"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  priceMenuItemFromCatalog,
  type MenuCatalog,
  type MenuItem,
  type SelectionInput,
} from "@/lib/menu";

type CartLine = {
  key: string;
  itemId: string;
  variationId: string;
  name: string;
  variationName: string | null;
  quantity: number;
  unitPriceCents: number;
  selections: SelectionInput[];
  selectionLabels: string[];
};

type CheckoutState = {
  customerName: string;
  phone: string;
  email: string;
  requestedTime: string;
  notes: string;
};

const initialCheckout: CheckoutState = {
  customerName: "",
  phone: "",
  email: "",
  requestedTime: "",
  notes: "",
};

function cartKey(itemId: string, variationId: string, selections: SelectionInput[]) {
  const normalized = [...selections].sort((a, b) =>
    `${a.groupId}:${a.value}`.localeCompare(`${b.groupId}:${b.value}`),
  );
  return `${itemId}:${variationId}:${JSON.stringify(normalized)}`;
}

function defaultSelections(item: MenuItem) {
  return Object.fromEntries(
    (item.optionGroups ?? []).map((group) => [
      group.id,
      group.options.filter((option) => option.defaultSelected).map((option) => option.value),
    ]),
  );
}

function CustomBuilder({
  catalog,
  item,
  onAdd,
}: {
  catalog: MenuCatalog;
  item: MenuItem;
  onAdd: (line: CartLine) => void;
}) {
  const firstVariation = item.variations?.find((variation) => variation.available);
  const [variationId, setVariationId] = useState(firstVariation?.id ?? "");
  const [selected, setSelected] = useState<Record<string, string[]>>(() => defaultSelections(item));
  const [message, setMessage] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [item.optionGroups?.[0]?.id ?? ""]: true,
  }));

  useEffect(() => {
    const stillAvailable = item.variations?.some(
      (variation) => variation.id === variationId && variation.available,
    );
    if (!stillAvailable) {
      setVariationId(item.variations?.find((variation) => variation.available)?.id ?? "");
    }
  }, [item, variationId]);

  useEffect(() => {
    setSelected((current) =>
      Object.fromEntries(
        (item.optionGroups ?? []).map((group) => {
          const availableValues = new Set(group.options.map((option) => option.value));
          const kept = (current[group.id] ?? []).filter((value) => availableValues.has(value));
          const defaults = group.options
            .filter((option) => option.defaultSelected)
            .map((option) => option.value);
          return [group.id, kept.length ? kept : defaults];
        }),
      ),
    );
  }, [item]);

  const selections = useMemo<SelectionInput[]>(
    () =>
      Object.entries(selected).flatMap(([groupId, values]) =>
        values.map((value) => ({ groupId, value })),
      ),
    [selected],
  );

  const price = useMemo(() => {
    try {
      return priceMenuItemFromCatalog(catalog, item.id, variationId, selections).totalCents;
    } catch {
      return item.variations?.find((variation) => variation.id === variationId)?.priceCents ?? item.priceCents;
    }
  }, [catalog, item, variationId, selections]);

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
      const priced = priceMenuItemFromCatalog(catalog, item.id, variationId, selections);
      const showVariation = (item.variations?.length ?? 0) > 1;
      onAdd({
        key: cartKey(item.id, priced.variation.id, selections),
        itemId: item.id,
        variationId: priced.variation.id,
        name: item.name,
        variationName: showVariation ? priced.variation.name : null,
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
    <article className={`custom-builder builder-tone-${item.builderTone ?? "ocean"}`} id={item.slug ?? item.id}>
      <div className="builder-top">
        <div>
          <p>MAKE IT YOURS</p>
          <h3>{item.name}</h3>
          {item.menuNote ? <small>{item.menuNote}</small> : null}
        </div>
        <strong>{formatMoney(price)}</strong>
      </div>

      {(item.variations?.length ?? 0) > 1 ? (
        <fieldset className="builder-variation-picker">
          <legend>Choose a size</legend>
          <div>
            {item.variations?.map((variation) => (
              <label className={variationId === variation.id ? "variation-selected" : ""} key={variation.id}>
                <input
                  type="radio"
                  name={`${item.id}-variation`}
                  checked={variationId === variation.id}
                  onChange={() => setVariationId(variation.id)}
                />
                <span>{variation.name}</span>
                <strong>{formatMoney(variation.priceCents)}</strong>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

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
                  <small>{group.help ?? "Choose any that sound good"}</small>
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
        <p className="builder-message" aria-live="polite">{message}</p>
        <button className="builder-add-button" type="button" onClick={addBuilderToCart}>
          Add this build
        </button>
      </div>
    </article>
  );
}

function SimpleOrderItem({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (line: CartLine) => void;
}) {
  const variations = item.variations ?? [];
  const [variationId, setVariationId] = useState(
    variations.find((variation) => variation.available)?.id ?? "",
  );
  const variation = variations.find((candidate) => candidate.id === variationId) ?? variations[0];

  function add() {
    if (!variation) return;
    const showVariation = variations.length > 1;
    onAdd({
      key: cartKey(item.id, variation.id, []),
      itemId: item.id,
      variationId: variation.id,
      name: item.name,
      variationName: showVariation ? variation.name : null,
      quantity: 1,
      unitPriceCents: variation.priceCents,
      selections: [],
      selectionLabels: [],
    });
  }

  return (
    <article className="order-item-row">
      <div>
        <h3>{item.name}</h3>
        {item.description ? <p>{item.description}</p> : null}
        {variations.length > 1 ? (
          <label className="simple-variation-select">
            <span>Size</span>
            <select value={variationId} onChange={(event) => setVariationId(event.target.value)}>
              {variations.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.name} · {formatMoney(candidate.priceCents)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <strong>{variation ? formatMoney(variation.priceCents) : "Unavailable"}</strong>
      <button className="add-item-button" type="button" onClick={add} disabled={!variation}>
        Add
      </button>
    </article>
  );
}

export function OrderExperience({ initialCatalog }: { initialCatalog: MenuCatalog }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkout, setCheckout] = useState<CheckoutState>(initialCheckout);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [squareReturn, setSquareReturn] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("happy-hearts-cart-v2");
      if (stored) setCart(JSON.parse(stored) as CartLine[]);
      const params = new URLSearchParams(window.location.search);
      setSquareReturn(params.get("payment") === "return");
    } catch {
      window.localStorage.removeItem("happy-hearts-cart-v2");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem("happy-hearts-cart-v2", JSON.stringify(cart));
  }, [cart, loaded]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/square/catalog", { cache: "no-store" });
        if (!response.ok) return;
        const nextCatalog = (await response.json()) as MenuCatalog;
        if (nextCatalog.source === "square") setCatalog(nextCatalog);
      } catch {
        // Keep the last good menu visible. Checkout still validates live on the server.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const totalCents = cart.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );

  function addLine(line: CartLine) {
    setCart((current) => {
      const existing = current.find((entry) => entry.key === line.key);
      if (!existing) return [...current, line];
      return current.map((entry) =>
        entry.key === line.key ? { ...entry, quantity: entry.quantity + 1 } : entry,
      );
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
            variationId: line.variationId,
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
          squareOrderId: string;
          checkoutUrl: string;
        };
      };
      if (!response.ok || !result.ok || !result.order) {
        throw new Error(result.error || "The order could not be submitted.");
      }

      setCart([]);
      window.localStorage.removeItem("happy-hearts-cart-v2");
      window.location.assign(result.order.checkoutUrl);
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

  const menuItems = catalog.items.filter((item) => item.available !== false);
  const customItems = menuItems.filter((item) => item.optionGroups?.length);
  const simpleCategories = catalog.categories.filter((category) =>
    menuItems.some((item) => item.category === category && !item.optionGroups?.length),
  );
  const squareCheckoutAvailable = catalog.source === "square" && !catalog.warning;

  return (
    <div className="order-layout">
      <div className="order-menu">
        {squareReturn ? (
          <div className="square-return-note">
            <span aria-hidden="true">♥</span>
            <p>Your Square checkout is complete. Happy Hearts can now see and manage the order in Square.</p>
          </div>
        ) : null}

        {catalog.warning ? (
          <div className="square-return-note menu-sync-warning">
            <span aria-hidden="true">♥</span>
            <p>{catalog.warning}</p>
          </div>
        ) : null}

        {catalog.source === "square" ? (
          <p className="live-menu-note">Live menu and availability are synced from Square.</p>
        ) : null}

        {customItems.length ? (
          <>
            <div className="custom-builders-heading">
              <p>BUILD IT YOUR WAY</p>
              <h2>Open one section at a time, pick what sounds good, then add it to your order.</h2>
            </div>
            {customItems.map((item) => (
              <CustomBuilder catalog={catalog} item={item} key={item.id} onAdd={addLine} />
            ))}
          </>
        ) : null}

        {simpleCategories.map((category) => {
          const categoryItems = menuItems.filter(
            (item) => item.category === category && !item.optionGroups?.length,
          );
          return (
            <section className="order-category" key={category}>
              <h2>{category}</h2>
              <div className="simple-item-list">
                {categoryItems.map((item) => (
                  <SimpleOrderItem item={item} key={item.id} onAdd={addLine} />
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

        <>
          {cart.length === 0 ? (
            <p className="empty-cart">Your order is empty. Pick an item or build something your way.</p>
          ) : (
            <ul className="cart-lines">
              {cart.map((line) => (
                <li className="cart-line" key={line.key}>
                  <div className="cart-line-head">
                    <strong>
                      {line.name}{line.variationName ? ` · ${line.variationName}` : ""}
                    </strong>
                    <span>{formatMoney(line.unitPriceCents * line.quantity)}</span>
                  </div>
                  {line.selectionLabels.length ? (
                    <ul>{line.selectionLabels.map((label) => <li key={label}>{label}</li>)}</ul>
                  ) : null}
                  <div className="cart-line-controls">
                    <div className="quantity-controls">
                      <button type="button" aria-label={`Decrease ${line.name} quantity`} onClick={() => changeQuantity(line.key, -1)}>−</button>
                      <span>{line.quantity}</span>
                      <button type="button" aria-label={`Increase ${line.name} quantity`} onClick={() => changeQuantity(line.key, 1)}>+</button>
                    </div>
                    <button type="button" className="remove-line" onClick={() => setCart((current) => current.filter((item) => item.key !== line.key))}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="checkout-form" onSubmit={submitOrder}>
            <h3>Pickup details</h3>
            <div className="square-checkout-summary">
              <span aria-hidden="true">♥</span>
              <div>
                <strong>Online orders are pickup only.</strong>
                <small>Need delivery? Call <a href="tel:+15016131513">501-613-1513</a> so Happy Hearts can confirm availability and any fee.</small>
              </div>
            </div>
            <div className="form-grid">
              <label>Name *<input required autoComplete="name" value={checkout.customerName} onChange={(event) => setCheckout((current) => ({ ...current, customerName: event.target.value }))} /></label>
              <label>Phone *<input required type="tel" autoComplete="tel" value={checkout.phone} onChange={(event) => setCheckout((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Email<input type="email" autoComplete="email" value={checkout.email} onChange={(event) => setCheckout((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Requested pickup time<input placeholder="Example: Today around 5:30" value={checkout.requestedTime} onChange={(event) => setCheckout((current) => ({ ...current, requestedTime: event.target.value }))} /></label>
              <label>Order notes or allergy information<textarea value={checkout.notes} onChange={(event) => setCheckout((current) => ({ ...current, notes: event.target.value }))} /></label>
            </div>

            <button className="checkout-submit" type="submit" disabled={submitting || !squareCheckoutAvailable}>
              {!squareCheckoutAvailable
                ? "Online ordering is reconnecting"
                : submitting
                  ? "Opening Square…"
                  : `Continue to secure Square checkout · ${formatMoney(totalCents)}`}
            </button>
            {error ? <p className="checkout-error" role="alert">{error}</p> : null}
            <p className="checkout-note">Square is the source of truth for this order. The live menu is checked again before checkout, then Square applies configured taxes and discounts and stores the completed order and payment.</p>
          </form>
        </>
      </aside>
    </div>
  );
}
