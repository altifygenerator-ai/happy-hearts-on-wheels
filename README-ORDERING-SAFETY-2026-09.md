# Happy Hearts ordering safety update — September 2026

This update is intentionally limited to website-order safety and the staff approval experience.
It does not change Square catalog/menu mapping, prices, item photos, modifiers, or sold-out logic.

## What changed

1. The server still checks ordering availability before both quote and order creation.
2. Normal hours come from the Square location when Square has business hours saved.
3. If Square has no hours saved, the site uses the published Happy Hearts fallback schedule:
   Friday-Tuesday 11 AM-7 PM, Wednesday-Thursday closed.
4. Staff now has a clear Pause/Resume control at `/staff/orders`.
5. Pause state is stored on the Square location as an application-owned custom attribute, so it survives deploys and does not need Supabase/Redis.
6. In approval mode, online ordering automatically closes if the staff approval screen stops checking in for about four minutes. This prevents customers from submitting orders when nobody is watching the queue.
7. The approval screen checks in every minute, polls orders every eight seconds, can keep the tablet awake, and repeats an audible/vibration reminder while an order is waiting.
8. Customer confirmation now stays visibly PENDING until Square reports the payment completed or canceled. Customers are explicitly told not to head to pickup until the order is accepted.

## First use after deployment

1. Open `https://www.happyheartsonwheels.net/staff/orders` on the Square tablet/phone.
2. Log in with `STAFF_ORDER_PASSWORD`.
3. Tap `Enable alerts + keep awake` and allow notifications.
4. Leave that screen open while website ordering is available.
5. The status card at the top must say `Orders are ON` before customers can submit approval-mode orders.
6. To stop website orders immediately, choose a pause length and tap `Pause online orders`.
7. For an event/closure, use `Until I turn them back on`. Tap `Turn online orders back on` when ready.

## Important safety behavior

If the approval screen is closed, backgrounded long enough for the browser to stop timers, loses internet, or Square's ordering-control state cannot be verified, the public site fails CLOSED and refuses new orders.

No extra database is required. The Square production access token must be able to read/write Location Custom Attributes (MERCHANT_PROFILE_READ / MERCHANT_PROFILE_WRITE). The production access token for the seller-owned Square application normally has access, but verify this during the first test.
