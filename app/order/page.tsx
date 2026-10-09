import type { Metadata } from "next";
import { OrderExperience } from "./OrderExperience";
import { getMenuCatalog } from "@/lib/square-catalog";

export const metadata: Metadata = {
  title: "Order Online | Pickup in Malvern, AR",
  alternates: { canonical: "/order" },
  openGraph: { url: "/order", title: "Order Happy Hearts on Wheels Online" },
  description:
    "Order custom salads, stir fry, build-your-own smoothies, wraps, tacos, sides and drinks directly from Happy Hearts on Wheels in Malvern, Arkansas.",
};

export default async function OrderPage() {
  const catalog = await getMenuCatalog();
  return (
    <div className="inner-page order-inner-page">
      <header className="page-intro island-page-intro order-page-intro">
        <div>
          <p className="eyebrow"><span aria-hidden="true">♥</span> ORDER DIRECT</p>
          <h1>Build your meal, then send it to the truck.</h1>
        </div>
        <p>
          Online orders are sent through Square for pickup at 801 Hwy 270. For delivery, call
          Happy Hearts first so they can confirm availability and any fee.
        </p>
      </header>
      <OrderExperience initialCatalog={catalog} />
    </div>
  );
}
