import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.happyheartsonwheels.net";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Happy Hearts on Wheels | Fresh Food in Malvern, Arkansas",
    template: "%s | Happy Hearts on Wheels",
  },

  description:
    "Custom salads, stir fry, smoothies and lighter comfort food at 801 Hwy 270 in Malvern, Arkansas. Open Friday through Tuesday, 11 AM to 7 PM.",

  verification: {
    google: "yy0m-F6oZewmjRHpFIpweeACSdTHxRLsg7k-PDU0XJQ",
  },

  icons: {
    icon: "/icon.svg",
  },

  alternates: {
    canonical: siteUrl,
  },

  openGraph: {
    title: "Happy Hearts on Wheels",
    description:
      "Custom salads, stir fry, smoothies and lighter comfort food in Malvern, Arkansas.",
    type: "website",
    siteName: "Happy Hearts on Wheels",
    locale: "en_US",
    url: siteUrl,
    images: [
      {
        url: "/images/salad-bar.webp",
        width: 1224,
        height: 709,
        alt: "Fresh salad bar at Happy Hearts on Wheels",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Happy Hearts on Wheels",
    description:
      "Custom salads, stir fry, smoothies and lighter comfort food in Malvern, Arkansas.",
    images: ["/images/salad-bar.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />

        <main>{children}</main>

        <SiteFooter />

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}