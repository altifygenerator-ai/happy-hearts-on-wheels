import Link from "next/link";
import { BrandMark } from "./BrandMark";

const navItems = [
  { href: "/#our-food", label: "Our Food" },
  { href: "/menu", label: "Menu" },
  { href: "/#find-us", label: "Find Us" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="island-info-bar">
        <div>
          <span>801 Hwy 270 · Malvern, Arkansas</span>
          <span className="info-heart" aria-hidden="true">♥</span>
          <span>Friday–Tuesday · 11 AM–7 PM</span>
        </div>
        <a href="tel:+15016131513">Call 501-613-1513</a>
      </div>

      <div className="island-masthead">
        <Link className="brand-lockup" href="/" aria-label="Happy Hearts on Wheels home">
          <BrandMark />
          <span className="brand-words">
            <strong>Happy Hearts</strong>
            <small>on Wheels</small>
          </span>
        </Link>

        <div className="masthead-stamp" aria-label="Fresh custom food made your way">
          <span className="stamp-heart" aria-hidden="true">♥</span>
          <span>
            <strong>Fresh Your Way</strong>
            <small>Custom salads · Stir fry · Smoothies</small>
          </span>
        </div>
      </div>

      <div className="island-nav-row">
        <nav className="island-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="order-nav-link" href="/order">
            Order Online
            <span aria-hidden="true">♥</span>
          </Link>
        </nav>
      </div>

      <div className="header-wave" aria-hidden="true" />
    </header>
  );
}
