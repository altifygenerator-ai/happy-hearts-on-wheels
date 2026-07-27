import type { Metadata } from "next";
import { OrderExperience } from "./OrderExperience";

export const metadata: Metadata = {
  title: "Order Online",
  description:
    "Order custom salads, stir fry, build-your-own smoothies, wraps, tacos, sides and drinks directly from Happy Hearts on Wheels in Malvern, Arkansas.",
};

export default function OrderPage() {
  return (
    <div className="inner-page order-inner-page">
      <header className="page-intro island-page-intro order-page-intro">
        <div>
          <p className="eyebrow"><span aria-hidden="true">♥</span> ORDER DIRECT</p>
          <h1>Build your meal, then send it to the truck.</h1>
        </div>
        <p>
          Pickup is available at 801 Hwy 270. Delivery requests are confirmed by phone so Happy
          Hearts can verify availability and any fee before accepting the order.
        </p>
      </header>
      <OrderExperience />
    </div>
  );
}
