# Happy Hearts on Wheels

Custom Next.js website for Happy Hearts on Wheels in Malvern, Arkansas.

## How the live ordering system works

Square is the only source of truth for online ordering:

- **Square Catalog** supplies menu items, categories, sizes, prices, modifier groups, paid extras, taxes, discounts, and sold-out availability.
- **Square Checkout** creates the secure hosted checkout page.
- **Square Orders** stores the completed pickup order and its fulfillment details.
- **Square Payments** stores the payment.
- **Square Dashboard / POS** is where the business manages orders after payment.
- **Square webhooks** tell the website when the catalog changes so its cached menu can be refreshed.

There is no Supabase project, local production order database, or custom order dashboard. The hardcoded menu in `lib/menu.ts` is only a non-orderable visual fallback before Square credentials are connected; Square is the production menu source.

## Important ordering limitation

The website currently accepts **paid pickup orders through Square**. Delivery is handled by phone because Square's public Orders API does not make ordinary API-created delivery fulfillments available in Square Point of Sale without Square partner access. Keeping delivery out of the automated checkout avoids creating orders the business cannot reliably manage in Square.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Add Sandbox Square credentials to `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN
SQUARE_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID
SQUARE_API_VERSION=2026-07-15
SQUARE_PICKUP_PREP_TIME_MINUTES=20
```

4. Start the site:

```bash
npm run dev
```

## Square catalog setup

The website does not keep a separate hardcoded production menu. Set up the complete online ordering menu inside Square:

- Each menu product should be a Square item.
- Sizes should be Square item variations.
- Salad, stir-fry, and smoothie choices should be Square modifier lists.
- Paid extras should have their added price on the Square modifier.
- Any ingredient that may sell out separately, such as lettuce, should be its own Square modifier.
- Items and modifiers intended for the website must be available online and present at the selected Square location.

When a variation or modifier is marked sold out for the location, the website removes it from new menu loads. The order API also retrieves Square live again immediately before creating checkout, so a stale browser cannot submit an ingredient that has since sold out.

## Vercel production variables

In Vercel, open **Project → Settings → Environment Variables** and add:

```env
NEXT_PUBLIC_SITE_URL=https://www.happyheartsonwheels.net
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=YOUR_PRODUCTION_ACCESS_TOKEN
SQUARE_LOCATION_ID=YOUR_PRODUCTION_LOCATION_ID
SQUARE_API_VERSION=2026-07-15
SQUARE_PICKUP_PREP_TIME_MINUTES=20
```

Set `SQUARE_PICKUP_PREP_TIME_MINUTES` to the truck's normal preparation time. Square uses it to schedule ASAP pickup fulfillments.

The site keeps Square-hosted Checkout as the safe default. A Production Square Application ID is only required when the optional approval-before-charge mode is enabled.

Never put `SQUARE_ACCESS_TOKEN` in frontend code, GitHub, Messenger, or a variable beginning with `NEXT_PUBLIC_`.


## Vercel Analytics and performance monitoring

This build includes both Vercel Web Analytics and Vercel Speed Insights. After importing the project into Vercel:

1. Open the project in Vercel.
2. Enable **Analytics**.
3. Enable **Speed Insights**.
4. Redeploy once after enabling them.

No analytics API keys or environment variables are required.

## Email / Resend

Resend is not required for the current ordering flow. Square stores the order, payment, customer details, and pickup fulfillment, and Square is where the business manages order notifications. The website currently uses a normal email link for general contact, so there is no Resend route or Resend environment variable to configure.

If a contact form or separate backup order email is added later, verify a sending subdomain under the business domain, such as `mail.happyheartsonwheels.net`, instead of sending customer-facing Happy Hearts email from the unrelated Hometown Web Services domain.

## Webhook setup

Deploy the website first. Its webhook endpoint is:

```text
https://www.happyheartsonwheels.net/api/square/webhook
```

Then in the Square Developer Console:

1. Open **Happy Hearts Website**.
2. Switch to **Production**.
3. Open **Webhooks**.
4. Choose **Add Endpoint**.
5. Enter the exact webhook URL above.
6. Choose the same API version used by the site.
7. Keep the existing catalog event and, before enabling approval mode, add the payment event:

```text
catalog.version.updated
payment.updated
```

8. Save the endpoint.
9. Copy the generated **Signature Key** into Vercel:

```env
SQUARE_WEBHOOK_NOTIFICATION_URL=https://www.happyheartsonwheels.net/api/square/webhook
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_WEBHOOK_SIGNATURE_KEY
```

10. Redeploy the project after adding the variables.

The notification URL in Vercel must match the URL entered in Square exactly, including `https`, domain, path, and whether a trailing slash is present.

## What happens when Square changes

1. The owner changes an item, price, size, modifier, or sold-out setting in Square.
2. Square sends `catalog.version.updated` to the website.
3. The website invalidates the cached home, menu, and order data.
4. The ordering page also checks for a fresh Square menu every 30 seconds while open.
5. Immediately before checkout, the server retrieves Square live and validates every selected variation and modifier again.


## Ordering hours and approval-before-charge rollout

The website now checks the Happy Hearts Square location before checkout. Square's saved business hours are the source of truth, and online ordering closes early by `SQUARE_PICKUP_PREP_TIME_MINUTES` so a last-minute order cannot arrive at closing. The server repeats this check immediately before any Square checkout or card authorization, so an old browser tab cannot bypass closing time.

The new accept-before-charge flow is feature-flagged so deploying this code does **not** replace the currently working hosted checkout by itself. Start with:

```env
SQUARE_PAYMENT_MODE=hosted
SQUARE_APPLICATION_ID=YOUR_PRODUCTION_APPLICATION_ID
SQUARE_APPROVAL_TIMEOUT_MINUTES=15
STAFF_ORDER_PASSWORD=USE_A_PRIVATE_PASSWORD
```

With `hosted`, the existing payment-link workflow remains active. After testing the new flow and the physical kitchen printer, switch only this variable and redeploy:

```env
SQUARE_PAYMENT_MODE=approval
```

Approval mode works like this:

1. The website checks the live Square menu and location hours.
2. Square calculates the real total including Square taxes and discounts.
3. Square's Web Payments card fields tokenize the customer's card; raw card data never enters this app.
4. The server creates the Square pickup order and authorizes the card with delayed capture.
5. The order appears at `/staff/orders` as waiting for approval.
6. **Accept & charge** captures the approved Square payment and pays the Square order.
7. **Decline** cancels the authorization and cancels the Square order.
8. An unanswered authorization automatically cancels after `SQUARE_APPROVAL_TIMEOUT_MINUTES`.

The staff queue does not use Supabase or a second order database. It reads pending website authorizations directly from Square. Browser alerts/chimes on the staff page are a convenience; Square remains the actual order/payment record.

Before switching production to approval mode, add `payment.updated` to the same existing Square production webhook subscription. The existing `catalog.version.updated` event must remain enabled.

### Printer test before production switch

The client cooks from Square's physical kitchen ticket. Test one real low-cost order before enabling approval mode for customers: authorize it from the website, accept it at `/staff/orders`, verify Square captures the payment, verify the paid pickup order appears in the normal Square Order Manager/POS flow, and verify the existing printer profile prints the item and modifier details. If the printer does not behave correctly, leave `SQUARE_PAYMENT_MODE=hosted` while printer routing is corrected.

## Production test checklist

- Confirm the website shows the same prices as Square.
- Mark a test modifier sold out in Square and verify it disappears from `/order` after refresh.
- Restore the modifier and verify it returns.
- Place a small paid pickup order.
- Confirm the payment and itemized order appear in Square.
- Confirm customer name, phone, pickup note, item variations, and modifiers are present.
- Confirm Square-applied taxes and discounts are correct.
- Refund the test order from Square if needed.

## Commands

```bash
npm run dev
npm run build
npm start
```
