Happy Hearts on Wheels - online ordering hours patch

This patch ONLY changes online-order availability behavior.

What it does:
- Reads the Happy Hearts location business hours from the existing Square Location API.
- Uses the Square location timezone, not the customer's device timezone.
- Stops accepting new online orders SQUARE_PICKUP_PREP_TIME_MINUTES before closing.
- Refreshes the visible open/closed status every 30 seconds.
- Performs a fresh server-side Square hours check on every checkout attempt, so an old open browser tab cannot submit an order after ordering has closed.
- Fails closed if Square business hours cannot be verified.

No changes were made to:
- Square catalog/menu parsing
- prices, modifiers, sold-out handling, or item images
- Square checkout/payment-link creation
- Square webhook verification or subscriptions
- homepage, menu page, styling, analytics, logos, or other site content

Square setup required:
Make sure the business hours for the SQUARE_LOCATION_ID location are correct in Square.
The existing SQUARE_PICKUP_PREP_TIME_MINUTES value controls how many minutes before closing online ordering stops.
No new API keys, webhook events, or environment variables are required.
