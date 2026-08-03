import Link from "next/link";
import { itemPriceLabel, type MenuCatalog } from "@/lib/menu";

export function MenuPreview({ catalog }: { catalog: MenuCatalog }) {
  const previewCategories = catalog.categories.filter((category) =>
    catalog.items.some(
      (item) => item.category === category && !item.optionGroups?.length && item.available !== false,
    ),
  );
  const customItems = catalog.items.filter(
    (item) => item.optionGroups?.length && item.available !== false,
  );

  return (
    <section className="menu-board-section" id="menu">
      <div className="menu-island-heading">
        <div className="menu-heading-heart" aria-hidden="true">♥</div>
        <div>
          <p>THE EVERYDAY MENU</p>
          <h2>Fresh, simple and full of choices.</h2>
        </div>
        <span>
          Start with a favorite or build something from the salad bar. Prices and availability
          stay tied to the live Square menu.
        </span>
      </div>

      <div className="tropical-menu-board">
        <div className="menu-board-sun" aria-hidden="true" />
        {previewCategories.slice(0, 4).map((category, categoryIndex) => {
          const items = catalog.items
            .filter(
              (item) =>
                item.category === category &&
                !item.optionGroups?.length &&
                item.available !== false,
            )
            .slice(0, category.toLowerCase() === "sides" ? 7 : 6);
          return (
            <div className={`menu-column menu-column-${categoryIndex + 1}`} key={category}>
              <h3><span aria-hidden="true">♥</span>{category}</h3>
              <div>
                {items.map((item) => (
                  <article className={`menu-line${item.imageUrl ? " menu-line-has-image" : ""}`} key={item.id}>
                    {item.imageUrl ? (
                      <img
                        className="menu-line-image"
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <div>
                      <strong>{item.name}</strong>
                      {item.description ? <small>{item.description}</small> : null}
                    </div>
                    <span>{itemPriceLabel(item)}</span>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="menu-board-footer">
        <p>
          {customItems.length
            ? customItems
                .slice(0, 3)
                .map((item) => `${item.name} ${itemPriceLabel(item)}`)
                .join(" · ")
            : "Fresh choices made your way."}
        </p>
        <Link href="/menu">See the full menu</Link>
      </div>
    </section>
  );
}
