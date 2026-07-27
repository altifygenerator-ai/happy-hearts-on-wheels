import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Happy Hearts on Wheels | Fresh Food in Malvern, Arkansas",
    template: "%s | Happy Hearts on Wheels",
  },
  description:
    "Custom salads, stir fry, smoothies and lighter comfort food at 801 Hwy 270 in Malvern, Arkansas. Open Friday through Tuesday, 11 AM to 7 PM.",
  openGraph: {
    title: "Happy Hearts on Wheels",
    description:
      "Custom salads, stir fry, smoothies and lighter comfort food in Malvern, Arkansas.",
    type: "website",
    url: siteUrl,
    images: [{ url: "/images/salad-bar.webp", width: 1224, height: 709 }],
  },
  alternates: { canonical: siteUrl },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
