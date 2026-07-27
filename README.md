# Happy Hearts on Wheels

A custom Next.js site for Happy Hearts on Wheels in Malvern, Arkansas. The design uses the bright ocean, sunshine, coral-red hearts and tropical menu-board feel from the business's real flyers without turning the site into a generic resort template.

## Included

- Bright island-style responsive homepage
- Balanced two-column full menu without the large empty grid gaps
- Direct online ordering experience
- Accordion-style builders that keep large ingredient lists clean
- Build-your-own salad configurator
- Custom stir-fry configurator
- Build-your-own smoothie configurator using the menu's fruit and vegetable choices
- Pickup and delivery-request checkout
- Server-side price and option validation
- Supabase order storage
- Password-protected order dashboard at `/admin`
- Optional owner and customer email confirmations through Resend
- Square-hosted checkout integration for pickup orders
- Square payment webhook endpoint for local payment status updates
- Order status controls
- Local development fallback storage in `.data/orders.json`
- LocalBusiness structured data, sitemap, robots and page metadata
- Optimized copies of the provided truck and salad-bar photos

## Start locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The project intentionally does not include a copied `node_modules` folder or an old package lock. Running `npm install` creates a clean lock file on the machine where the site is being used.

## Connect production ordering

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`. It can also upgrade the earlier version of the order table.
3. In Vercel, add:

```text
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVER-ONLY-SERVICE-ROLE-KEY
ADMIN_PASSWORD=CHOOSE-A-PRIVATE-PASSWORD
ADMIN_SESSION_SECRET=CHOOSE-A-LONG-RANDOM-SECRET
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN.com
RESEND_API_KEY=YOUR-RESEND-KEY
ORDER_FROM_EMAIL=Happy Hearts Orders <orders@YOUR-DOMAIN.com>
ORDER_NOTIFICATION_EMAIL=happyhearts2026@outlook.com
```

Never expose the Supabase service-role key or Square access token in a browser variable.

Without Supabase, orders are saved to `.data/orders.json` during local development. Production ordering returns a clear call-the-business message until Supabase is connected, so orders are never silently lost.

## Connect Square

The site uses Square's hosted Checkout API rather than placing card fields directly on the Happy Hearts site. That keeps the site lightweight and makes the first integration easier to maintain.

1. Create or open a Square developer application.
2. Copy the correct access token and location ID into Vercel.
3. Start in Sandbox:

```text
NEXT_PUBLIC_SQUARE_ENABLED=true
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN
SQUARE_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID
SQUARE_API_VERSION=2026-07-15
```

4. In Square's Developer Console, create a webhook subscription for:

```text
payment.created
payment.updated
```

5. Use this notification URL and copy its signature key into Vercel:

```text
https://YOUR-DOMAIN.com/api/square/webhook
SQUARE_WEBHOOK_NOTIFICATION_URL=https://YOUR-DOMAIN.com/api/square/webhook
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_SIGNATURE_KEY
```

6. Test a pickup order in Sandbox. When it is paid, the private dashboard should change the payment status to `Paid`.
7. When ready, replace the credentials with production values and set:

```text
SQUARE_ENVIRONMENT=production
```

Square payment is intentionally limited to pickup orders. Delivery requests remain pay-after-confirmation because the owner said delivery availability and the extra delivery charge need to be confirmed first.

## Ordering behavior

The checkout records the customer, phone number, fulfillment, delivery address when needed, requested time, notes, selected menu options and a server-calculated total.

- **Pay after confirmation:** the business receives the order and confirms it by phone.
- **Pay securely with Square:** for pickup orders, the site creates an itemized Square order and redirects the buyer to Square's hosted checkout page.
- **Webhook update:** Square payment events update the local order's payment status in the admin dashboard.

## Editing the menu

All items, prices and custom options live in:

```text
lib/menu.ts
```

The same data powers the full menu, ordering UI, Square itemization and server-side validation, so prices cannot drift between pages.

## Important business details currently used

- Happy Hearts on Wheels
- 801 Hwy 270, Malvern, AR 72104
- 501-613-1513
- Friday through Tuesday, 11 AM to 7 PM
- `happyhearts2026@outlook.com`
- No deep fryer
- 93% lean beef
- Grilled chicken
- Air-fried bacon
- Heart-conscious and diabetic-friendly choices

Review ingredient availability and wording with the owner before launch, especially health-related language and which vegetables they actually want offered in smoothies.
