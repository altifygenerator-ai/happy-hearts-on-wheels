import type { Metadata } from "next";
import Link from "next/link";
import { itemPriceLabel, type MenuCatalog, type MenuCategory } from "@/lib/menu";
import { getMenuCatalog } from "@/lib/square-catalog";

export const metadata: Metadata = {
  title: "Menu | Salads, Stir Fry & Smoothies in Malvern, AR",
  alternates: { canonical: "/menu" },
  openGraph: { url: "/menu", title: "Happy Hearts on Wheels Menu | Malvern, AR" },
  description:
    "See the Happy Hearts on Wheels menu, including custom salads, custom stir fry, build-your-own smoothies, wraps, tacos, sides and drinks in Malvern, Arkansas.",
};

function MenuCategorySection({
  category,
  catalog,
  number,
}: {
  category: MenuCategory;
  catalog: MenuCatalog;
  number: number;
}) {
  const items = catalog.items.filter(
    (item) => item.category === category && item.available !== false,
  );

  return (
    <section className={`full-menu-category full-menu-category-${((number - 1) % 5) + 1}`}>
      <h2>
        <span aria-hidden="true">♥</span>
        {category}
      </h2>
      {items.map((item) => (
        <article
          className={`full-menu-item${item.optionGroups ? " full-menu-item-custom" : ""}${item.imageUrl ? " full-menu-item-has-image" : ""}`}
          key={item.id}
        >
          {item.imageUrl ? (
            <img
              className="full-menu-item-image"
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="full-menu-item-content">
            <div className="full-menu-item-head">
              <h3>{item.name}</h3>
              <span className="full-menu-item-price">{itemPriceLabel(item)}</span>
            </div>
            {item.description ? <p>{item.description}</p> : null}
            {(item.variations?.length ?? 0) > 1 ? (
              <div className="menu-variation-tags">
                {item.variations?.map((variation) => (
                  <span key={variation.id}>
                    {variation.name} · ${(variation.priceCents / 100).toFixed(2)}
                  </span>
                ))}
              </div>
            ) : null}
            {item.optionGroups ? (
              <div className="custom-menu-details">
                <div className="custom-menu-tags" aria-label={`${item.name} choices`}>
                  {item.optionGroups.map((group) => (
                    <span key={group.id}>{group.label}</span>
                  ))}
                </div>
                <Link href={`/order#${item.slug ?? item.id}`}>Customize this online</Link>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}

export default async function MenuPage() {
  const catalog = await getMenuCatalog();
  const columns = [
    catalog.categories.filter((_, index) => index % 2 === 0),
    catalog.categories.filter((_, index) => index % 2 === 1),
  ];

  return (
    <div className="inner-page menu-inner-page">
      <header className="page-intro island-page-intro">
        <div>
          <p className="eyebrow"><span aria-hidden="true">♥</span> THE FULL MENU</p>
          <h1>Pick a favorite or build your own.</h1>
        </div>
        <p>
          The menu is simple, fresh and flexible. Availability can change with the day, and online
          choices update from the Happy Hearts Square menu.
        </p>
      </header>

      {catalog.source === "square" ? (
        <p className="live-menu-note menu-page-live-note">Live prices and availability from Square.</p>
      ) : null}

      <div className="menu-island-divider" aria-hidden="true">
        <span>☀</span><i /><b>♥</b><i /><span>☀</span>
      </div>

      <div className="full-menu-grid">
        {columns.map((column, columnIndex) => (
          <div className={`full-menu-column full-menu-column-${columnIndex + 1}`} key={columnIndex}>
            {column.map((category) => (
              <MenuCategorySection
                category={category}
                catalog={catalog}
                number={catalog.categories.indexOf(category) + 1}
                key={category}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="menu-page-note">
        <span aria-hidden="true">♥</span>
        <p>
          Paid extras and size prices update automatically from Square. Tell us about food allergies
          before ordering. <Link href="/order">Build your order online.</Link>
        </p>
      </div>
    </div>
  );
}
