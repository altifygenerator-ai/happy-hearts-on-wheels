import Image from "next/image";
import Link from "next/link";
import { MenuPreview } from "@/components/MenuPreview";
import { itemPriceLabel } from "@/lib/menu";
import { getMenuCatalog } from "@/lib/square-catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.happyheartsonwheels.net";

const businessSchema = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  "@id": `${siteUrl}/#business`,
  name: "Happy Hearts on Wheels",
  url: siteUrl,
  telephone: "+1-501-613-1513",
  image: `${siteUrl}/images/truck-location-2026.webp`,
  servesCuisine: ["Salads", "Stir Fry", "American"],
  address: {
    "@type": "PostalAddress",
    streetAddress: "801 Hwy 270",
    addressLocality: "Malvern",
    addressRegion: "AR",
    postalCode: "72104",
    addressCountry: "US",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"],
      opens: "11:00",
      closes: "19:00",
    },
  ],
  hasMenu: `${siteUrl}/menu`,
};

export default async function HomePage() {
  const catalog = await getMenuCatalog();
  const salad = catalog.items.find((item) => item.slug === "build-your-own-salad");
  const stirFry = catalog.items.find((item) => item.slug === "custom-stir-fry");
  const smoothie = catalog.items.find((item) => item.slug === "custom-smoothie");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />

      <section className="island-hero">
        <div className="palm-corner palm-corner-left" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="palm-corner palm-corner-right" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="hero-sun" aria-hidden="true" />

        <div className="hero-inner">
          <div className="hero-copy-block">
            <p className="hero-kicker"><span aria-hidden="true">♥</span> Fresh your way</p>
            <h1>Healthy choices with a little island sunshine.</h1>
            <p className="hero-copy">
              Build a salad from the 72-inch bar, create a custom stir fry or blend a smoothie
              from the fruit and vegetable bar. No deep fryer, grilled chicken, air-fried bacon and 93% lean beef.
            </p>

            <div className="hero-actions">
              <Link href="/order" className="primary-order-link">Start an online order</Link>
              <Link href="/menu" className="secondary-menu-link">See the full menu</Link>
            </div>

            <div className="hero-location-note">
              <strong>801 Hwy 270 · Malvern</strong>
              <span>Friday–Tuesday · 11 AM–7 PM</span>
            </div>
          </div>

          <div className="hero-photo-stage">
            <div className="hero-photo-wrap">
              <Image
                src="/images/truck-location-2026.webp"
                alt="Happy Hearts on Wheels food truck in Malvern, Arkansas"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 48vw"
              />
            </div>
            <div className="photo-heart-seal">
              <span aria-hidden="true">♥</span>
              <strong>Made with heart</strong>
              <small>in Malvern</small>
            </div>
            <div className="hero-fruit-dot hero-fruit-dot-one" aria-hidden="true" />
            <div className="hero-fruit-dot hero-fruit-dot-two" aria-hidden="true" />
          </div>
        </div>

        <div className="ocean-wave ocean-wave-one" aria-hidden="true" />
        <div className="ocean-wave ocean-wave-two" aria-hidden="true" />
      </section>

      <section className="fresh-facts" aria-label="Food preparation facts">
        <div><span>♥</span><strong>No deep fryer</strong></div>
        <div><span>♥</span><strong>Grilled chicken</strong></div>
        <div><span>♥</span><strong>93% lean beef</strong></div>
        <div><span>♥</span><strong>72-inch salad bar</strong></div>
      </section>

      <section className="build-section" id="our-food">
        <div className="build-photo-side">
          <div className="build-photo-shell">
            <Image
              src="/images/salad-bar.webp"
              alt="Fresh greens, vegetables, cheese and toppings at the Happy Hearts salad bar"
              fill
              sizes="(max-width: 900px) 100vw, 52vw"
            />
          </div>
          <div className="salad-bar-tag">
            <span>THE 72-INCH BAR</span>
            <strong>Pick what looks good.</strong>
          </div>
        </div>

        <div className="build-copy-side">
          <p className="section-label">BUILD IT YOUR WAY</p>
          <h2>A whole bar of fresh choices, not a one-size-fits-all meal.</h2>
          <p>
            Greens, vegetables, fruit, proteins, cheese, nuts, seeds and dressings are laid out so
            you can build the meal that works for you.
          </p>

          <div className="build-paths">
            <article>
              <span className="path-heart">♥</span>
              <div>
                <p>Custom Salad</p>
                <h3>Start with the greens, then make it yours.</h3>
                <small>{salad ? `${itemPriceLabel(salad)} from the live menu.` : "See the current price online."}</small>
              </div>
              <Link href="/order#build-your-own-salad">Build a salad</Link>
            </article>
            <article>
              <span className="path-heart">♥</span>
              <div>
                <p>Custom Stir Fry</p>
                <h3>Choose a base, vegetables and your flavor.</h3>
                <small>{stirFry ? `${itemPriceLabel(stirFry)} before selected extras.` : "See the current price online."}</small>
              </div>
              <Link href="/order#custom-stir-fry">Build a stir fry</Link>
            </article>
            <article>
              <span className="path-heart">♥</span>
              <div>
                <p>Custom Smoothie</p>
                <h3>Pick from the fruit and vegetable bar.</h3>
                <small>{smoothie ? `${itemPriceLabel(smoothie)} before selected extras.` : "See the current price online."}</small>
              </div>
              <Link href="/order#custom-smoothie">Build a smoothie</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="heart-story-section">
        <div className="heart-story-copy">
          <p className="section-label">WHY HAPPY HEARTS</p>
          <h2>Food shaped by real life and made with a lot of heart.</h2>
          <p>
            Happy Hearts on Wheels grew from the owner&apos;s own experience with heart issues and
            diabetes. The goal is simple: give people fresh choices that feel good without making
            every meal feel like a punishment.
          </p>
          <blockquote>
            <span aria-hidden="true">♥</span>
            “Our foods are heart healthy and diabetic friendly. We don&apos;t own a deep fryer.”
          </blockquote>
        </div>

        <div className="heart-story-notes">
          <div className="heart-story-logo">
            <Image
              src="/images/happy-hearts-logo.webp"
              alt="Happy Hearts on Wheels — foods that make the heart happy"
              width={720}
              height={543}
              sizes="(max-width: 900px) 240px, 260px"
            />
          </div>
          <article>
            <strong>Fresh first</strong>
            <p>Vegetables, greens and fruit are at the center of the menu.</p>
          </article>
          <article>
            <strong>Still satisfying</strong>
            <p>Wraps, tacos, burgers, salads, stir fry, smoothies and simple sides.</p>
          </article>
          <article>
            <strong>Easy to order</strong>
            <p>Order online for pickup through Square. Call the truck to ask about delivery.</p>
          </article>
        </div>
      </section>

      <MenuPreview catalog={catalog} />

      <section className="find-us-section" id="find-us">
        <div className="find-us-scene">
          <div className="find-us-sun" aria-hidden="true"><span>♥</span></div>
          <p>FIND THE TRUCK</p>
          <h2>801 Hwy 270</h2>
          <strong>Malvern, Arkansas 72104</strong>
          <a
            href="https://www.google.com/maps/search/?api=1&query=801+Hwy+270+Malvern+AR+72104"
            target="_blank"
            rel="noreferrer"
          >
            Open directions
          </a>
        </div>

        <div className="find-us-details">
          <div className="hours-heading">
            <span aria-hidden="true">♥</span>
            <div><small>HOURS</small><strong>Friday through Tuesday</strong></div>
          </div>
          <div className="hours-table">
            <div><span>Friday</span><strong>11 AM–7 PM</strong></div>
            <div><span>Saturday</span><strong>11 AM–7 PM</strong></div>
            <div><span>Sunday</span><strong>11 AM–7 PM</strong></div>
            <div><span>Monday</span><strong>11 AM–7 PM</strong></div>
            <div><span>Tuesday</span><strong>11 AM–7 PM</strong></div>
            <div className="closed-row"><span>Wednesday–Thursday</span><strong>Closed</strong></div>
          </div>
          <div className="location-actions">
            <a href="tel:+15016131513">Call 501-613-1513</a>
            <Link href="/order">Order online</Link>
          </div>
        </div>
      </section>

      <section className="final-order-strip">
        <div><span aria-hidden="true">♥</span><p>Fresh food, sunny mood, made your way.</p></div>
        <Link href="/order">Order direct from Happy Hearts</Link>
      </section>
    </>
  );
}
