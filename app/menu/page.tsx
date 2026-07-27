import type { Metadata } from "next";
import Link from "next/link";
import {
  formatMoney,
  menuCategories,
  menuItems,
  type MenuCategory,
} from "@/lib/menu";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "See the Happy Hearts on Wheels menu, including custom salads, custom stir fry, build-your-own smoothies, wraps, tacos, sides and drinks in Malvern, Arkansas.",
};

const categoryNumber = new Map<MenuCategory, number>(
  menuCategories.map((category, index) => [category, index + 1]),
);

const menuColumns: MenuCategory[][] = [
  ["Custom Favorites", "Salads", "Drinks"],
  ["Entrées", "Sides"],
];

function MenuCategorySection({ category }: { category: MenuCategory }) {
  const items = menuItems.filter((item) => item.category === category);
  const number = categoryNumber.get(category) ?? 1;

  return (
    <section className={`full-menu-category full-menu-category-${number}`}>
      <h2>
        <span aria-hidden="true">♥</span>
        {category}
      </h2>
      {items.map((item) => (
        <article className={`full-menu-item${item.optionGroups ? " full-menu-item-custom" : ""}`} key={item.id}>
          <div className="full-menu-item-head">
            <h3>{item.name}</h3>
            <span className="full-menu-item-price">{formatMoney(item.priceCents)}</span>
          </div>
          {item.description ? <p>{item.description}</p> : null}
          {item.optionGroups ? (
            <div className="custom-menu-details">
              <div className="custom-menu-tags" aria-label={`${item.name} choices`}>
                {item.optionGroups.map((group) => (
                  <span key={group.id}>{group.label}</span>
                ))}
              </div>
              {item.menuNote ? <p>{item.menuNote}</p> : null}
              <Link href={`/order#${item.id}`}>Customize this online</Link>
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export default function MenuPage() {
  return (
    <div className="inner-page menu-inner-page">
      <header className="page-intro island-page-intro">
        <div>
          <p className="eyebrow"><span aria-hidden="true">♥</span> THE FULL MENU</p>
          <h1>Pick a favorite or build your own.</h1>
        </div>
        <p>
          The menu is simple, fresh and flexible. Availability can change with the day, so call if
          you need to check on one specific ingredient before ordering.
        </p>
      </header>

      <div className="menu-island-divider" aria-hidden="true">
        <span>☀</span>
        <i />
        <b>♥</b>
        <i />
        <span>☀</span>
      </div>

      <div className="full-menu-grid">
        {menuColumns.map((column, columnIndex) => (
          <div className={`full-menu-column full-menu-column-${columnIndex + 1}`} key={column.join("-")}>
            {column.map((category) => (
              <MenuCategorySection category={category} key={category} />
            ))}
          </div>
        ))}
      </div>

      <div className="menu-page-note">
        <span aria-hidden="true">♥</span>
        <p>
          Chicken adds $2 where shown. Bacon and avocado add $1 where shown. Tell us about food
          allergies before ordering. <Link href="/order">Build your order online.</Link>
        </p>
      </div>
    </div>
  );
}
