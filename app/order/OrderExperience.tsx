"use client";

import Script from "next/script";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  formatMoney,
  priceMenuItemFromCatalog,
  type MenuCatalog,
  type MenuItem,
  type SelectionInput,
} from "@/lib/menu";



type OrderingStatus = {
  canOrder: boolean;
  isOpen: boolean;
  reason: "open" | "closed" | "prep-cutoff" | "unavailable";
  message: string;
  prepMinutes: number;
  timezone: string;
};

type SquarePaymentConfig = {
  mode: "hosted" | "approval";
  enabled: boolean;
  applicationId?: string;
  locationId?: string;
  sdkUrl?: string;
};

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: (details: {
    amount: string;
    currencyCode: string;
    intent: "CHARGE";
    customerInitiated: boolean;
    sellerKeyedIn: boolean;
    billingContact: {
      givenName?: string;
      familyName?: string;
      email?: string;
      phone?: string;
      countryCode: string;
    };
  }) => Promise<{
    status: string;
    token?: string;
    errors?: Array<{ message?: string }>;
  }>;
  destroy?: () => Promise<void> | void;
};

declare global {
  interface Window {
    Square?: {
      payments: (
        applicationId: string,
        locationId: string,
      ) => {
        card: () => Promise<SquareCard>;
      };
    };
  }
}

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
  expanded,
  onToggle,
}: {
  catalog: MenuCatalog;
  item: MenuItem;
  onAdd: (line: CartLine) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const firstVariation = item.variations?.find((variation) => variation.available);
  const [variationId, setVariationId] = useState(firstVariation?.id ?? "");
  const [selected, setSelected] = useState<Record<string, string[]>>(() => defaultSelections(item));
  const [message, setMessage] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    <article
      className={`custom-builder builder-tone-${item.builderTone ?? "ocean"}${expanded ? " builder-expanded" : ""}`}
      id={item.slug ?? item.id}
    >
      <button
        className={`builder-top builder-toggle${item.imageUrl ? " builder-top-has-image" : ""}`}
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {item.imageUrl ? (
          <img
            className="builder-item-image"
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <span className="builder-title-copy">
          <span className="builder-kicker">MAKE IT YOURS</span>
          <span className="builder-name">{item.name}</span>
          {item.menuNote ? <span className="builder-note">{item.menuNote}</span> : null}
        </span>
        <strong>{formatMoney(price)}</strong>
        <span className="builder-open-label">{expanded ? "Close" : "Customize"} <span aria-hidden="true">{expanded ? "▲" : "▼"}</span></span>
      </button>

      {expanded ? (
        <div className="builder-body">
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
        </div>
      ) : null}
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
  const imageUrl = variation?.imageUrl ?? item.imageUrl;

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
    <article className={`order-item-row${imageUrl ? " order-item-row-has-image" : ""}`}>
      {imageUrl ? (
        <img
          className="order-item-image"
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          decoding="async"
        />
      ) : null}
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
  const [openBuilderId, setOpenBuilderId] = useState("");
  const [orderingStatus, setOrderingStatus] = useState<OrderingStatus | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<SquarePaymentConfig | null>(null);
  const [squareSdkReady, setSquareSdkReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState<{
    orderNumber: string;
    totalCents: number;
  } | null>(null);
  const squareCard = useRef<SquareCard | null>(null);

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

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/ordering-status", { cache: "no-store" });
        if (!response.ok) return;
        setOrderingStatus((await response.json()) as OrderingStatus);
      } catch {
        setOrderingStatus({
          canOrder: false,
          isOpen: false,
          reason: "unavailable",
          message: "Online ordering is temporarily unavailable while business hours are being checked.",
          prepMinutes: 20,
          timezone: "America/Chicago",
        });
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetch("/api/square/payment-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: SquarePaymentConfig | null) => {
        if (result) setPaymentConfig(result);
      })
      .catch(() => setPaymentConfig({ mode: "hosted", enabled: false }));
  }, []);

  useEffect(() => {
    if (
      paymentConfig?.mode !== "approval" ||
      !paymentConfig.enabled ||
      !paymentConfig.applicationId ||
      !paymentConfig.locationId ||
      !squareSdkReady ||
      !window.Square ||
      squareCard.current
    ) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const payments = window.Square!.payments(
          paymentConfig.applicationId!,
          paymentConfig.locationId!,
        );
        const card = await payments.card();
        if (cancelled) {
          await card.destroy?.();
          return;
        }
        await card.attach("#square-card-container");
        squareCard.current = card;
        setCardReady(true);
      } catch (cardError) {
        console.error("Square card form failed to load", cardError);
        setError("The secure card form could not load. Please refresh the page.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentConfig, squareSdkReady]);

  useEffect(() => {
    const openFromHash = () => {
      const target = window.location.hash.replace(/^#/, "");
      if (!target) return;
      const matching = catalog.items.find(
        (item) => item.optionGroups?.length && (item.slug ?? item.id) === target,
      );
      if (!matching) return;
      setOpenBuilderId(matching.id);
      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [catalog]);

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

  function orderPayload() {
    return {
      ...checkout,
      items: cart.map((line) => ({
        itemId: line.itemId,
        variationId: line.variationId,
        quantity: line.quantity,
        selections: line.selections,
      })),
    };
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setApprovalSuccess(null);

    if (cart.length === 0) {
      setError("Add at least one item before submitting the order.");
      return;
    }
    if (orderingStatus && !orderingStatus.canOrder) {
      setError(orderingStatus.message);
      return;
    }

    setSubmitting(true);
    try {
      const payload = orderPayload();

      if (paymentConfig?.mode === "approval") {
        if (!paymentConfig.enabled || !squareCard.current || !cardReady) {
          throw new Error("The secure Square card form is still loading. Please try again in a moment.");
        }

        const quoteResponse = await fetch("/api/orders/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const quote = (await quoteResponse.json()) as {
          ok: boolean;
          totalCents?: number;
          error?: string;
        };
        if (!quoteResponse.ok || !quote.ok || !Number.isInteger(quote.totalCents)) {
          throw new Error(quote.error || "Square could not calculate the final total.");
        }

        const names = checkout.customerName.trim().split(/\s+/);
        const tokenResult = await squareCard.current.tokenize({
          amount: (Number(quote.totalCents) / 100).toFixed(2),
          currencyCode: "USD",
          intent: "CHARGE",
          customerInitiated: true,
          sellerKeyedIn: false,
          billingContact: {
            givenName: names[0] || undefined,
            familyName: names.length > 1 ? names.slice(1).join(" ") : undefined,
            email: checkout.email || undefined,
            phone: checkout.phone || undefined,
            countryCode: "US",
          },
        });

        if (tokenResult.status !== "OK" || !tokenResult.token) {
          const detail = tokenResult.errors?.map((entry) => entry.message).filter(Boolean).join(" ");
          throw new Error(detail || "Square could not verify the card. Please check the card information and try again.");
        }

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            paymentSourceId: tokenResult.token,
            expectedTotalCents: quote.totalCents,
          }),
        });
        const result = (await response.json()) as {
          ok: boolean;
          error?: string;
          order?: {
            orderNumber: string;
            totalCents: number;
            squareOrderId: string;
            paymentId?: string;
            awaitingApproval?: boolean;
          };
        };
        if (!response.ok || !result.ok || !result.order) {
          throw new Error(result.error || "The order could not be submitted.");
        }

        setCart([]);
        window.localStorage.removeItem("happy-hearts-cart-v2");
        setApprovalSuccess({
          orderNumber: result.order.orderNumber,
          totalCents: result.order.totalCents,
        });
        return;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        order?: {
          orderNumber: string;
          totalCents: number;
          squareOrderId: string;
          checkoutUrl?: string;
        };
      };
      if (!response.ok || !result.ok || !result.order?.checkoutUrl) {
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
  const liveMenuAvailable = catalog.source === "square" && !catalog.warning;
  const approvalMode = paymentConfig?.mode === "approval";
  const approvalReady = !approvalMode || Boolean(paymentConfig?.enabled && cardReady);
  const orderingOpen = orderingStatus?.canOrder ?? false;
  const checkoutAvailable = liveMenuAvailable && orderingOpen && approvalReady;

  return (
    <>
      {paymentConfig?.mode === "approval" && paymentConfig.enabled && paymentConfig.sdkUrl ? (
        <Script
          id="square-web-payments-sdk"
          src={paymentConfig.sdkUrl}
          strategy="afterInteractive"
          onLoad={() => setSquareSdkReady(true)}
        />
      ) : null}

      <div className="order-layout">
        <div className="order-menu">
          {approvalSuccess ? (
            <div className="square-return-note approval-pending-note">
              <span aria-hidden="true">♥</span>
              <p>
                <strong>{approvalSuccess.orderNumber} has been sent to Happy Hearts for approval.</strong>{" "}
                Your card is authorized for {formatMoney(approvalSuccess.totalCents)}, but it will not be
                charged unless the order is accepted.
              </p>
            </div>
          ) : null}

          {squareReturn ? (
            <div className="square-return-note">
              <span aria-hidden="true">♥</span>
              <p>Your Square checkout is complete. Happy Hearts can now see and manage the order in Square.</p>
            </div>
          ) : null}

          {orderingStatus ? (
            <div className={`ordering-status-note ordering-status-${orderingStatus.reason}`}>
              <span aria-hidden="true">{orderingStatus.canOrder ? "♥" : "☀"}</span>
              <div>
                <strong>{orderingStatus.canOrder ? "Online ordering is open" : "Online ordering is closed"}</strong>
                <p>{orderingStatus.message}</p>
              </div>
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
                <h2>Tap what you want to build. The choices stay tucked away until you need them.</h2>
              </div>
              {customItems.map((item) => (
                <CustomBuilder
                  catalog={catalog}
                  item={item}
                  key={item.id}
                  onAdd={addLine}
                  expanded={openBuilderId === item.id}
                  onToggle={() => setOpenBuilderId((current) => current === item.id ? "" : item.id)}
                />
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

              {approvalMode ? (
                <div className="approval-payment-box">
                  <div className="approval-payment-heading">
                    <span aria-hidden="true">♥</span>
                    <div>
                      <strong>Card authorization</strong>
                      <small>Square verifies the card now. Happy Hearts charges it only after accepting the order.</small>
                    </div>
                  </div>
                  <div id="square-card-container" className="square-card-container" />
                  {!cardReady ? <p className="card-loading-note">Loading secure Square card fields…</p> : null}
                  <p className="approval-explainer">
                    Taxes and any Square discounts are calculated before authorization. If the order is declined
                    or not accepted in time, the authorization is canceled instead of being captured.
                  </p>
                </div>
              ) : null}

              <button className="checkout-submit" type="submit" disabled={submitting || !checkoutAvailable}>
                {!liveMenuAvailable
                  ? "Online ordering is reconnecting"
                  : !orderingOpen
                    ? "Online ordering is closed"
                    : approvalMode && !approvalReady
                      ? "Secure card form is loading"
                      : submitting
                        ? approvalMode
                          ? "Sending for approval…"
                          : "Opening Square…"
                        : approvalMode
                          ? `Submit for approval · ${formatMoney(totalCents)} + tax`
                          : `Continue to secure Square checkout · ${formatMoney(totalCents)}`}
              </button>
              {error ? <p className="checkout-error" role="alert">{error}</p> : null}
              <p className="checkout-note">
                Square remains the source of truth for the live menu, prices, taxes, discounts and payment.
                {approvalMode
                  ? " Your card is authorized first and only captured after Happy Hearts accepts the order."
                  : " The live menu is checked again before checkout, then Square stores the completed order and payment."}
              </p>
            </form>
          </>
        </aside>
      </div>
    </>
  );
}
