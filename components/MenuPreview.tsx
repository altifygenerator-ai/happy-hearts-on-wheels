import Link from "next/link";
import { formatMoney, menuCategories, menuItems } from "@/lib/menu";

const previewCategories = menuCategories.filter((category) => category !== "Custom Favorites");

export function MenuPreview() {
  return (
    <section className="menu-board-section" id="menu">
      <div className="menu-island-heading">
        <div className="menu-heading-heart" aria-hidden="true">♥</div>
        <div>
          <p>THE EVERYDAY MENU</p>
          <h2>Fresh, simple and full of choices.</h2>
        </div>
        <span>
          Start with a favorite or build something from the salad bar. Prices are kept clear so
          ordering stays easy.
        </span>
      </div>

      <div className="tropical-menu-board">
        <div className="menu-board-sun" aria-hidden="true" />
        {previewCategories.map((category, categoryIndex) => {
          const items = menuItems
            .filter((item) => item.category === category)
            .slice(0, category === "Sides" ? 7 : 6);
          return (
            <div className={`menu-column menu-column-${categoryIndex + 1}`} key={category}>
              <h3><span aria-hidden="true">♥</span>{category}</h3>
              <div>
                {items.map((item) => (
                  <article className="menu-line" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      {item.description ? <small>{item.description}</small> : null}
                    </div>
                    <span>{formatMoney(item.priceCents)}</span>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="menu-board-footer">
        <p>
          Build-your-own salads start at <strong>$7.50</strong>, custom stir fry at{" "}
          <strong>$8.50</strong>, and build-your-own smoothies at <strong>$5.00</strong>.
        </p>
        <Link href="/menu">See the full menu</Link>
      </div>
    </section>
  );
}
