Heartbeat reliability patch for Happy Hearts staff ordering controls.

Changes only:
- app/api/staff/ordering-control/route.ts
- app/staff/orders/StaffOrders.tsx

What it fixes:
- Authenticated staff control polling now also writes the kitchen heartbeat.
- Resuming online orders immediately writes a fresh heartbeat.
- Staff screen performs an immediate control refresh on load.
- Kitchen connection errors are displayed separately instead of being cleared by a successful order refresh.
- Staff screen shows connected/not connected and last check-in time.

No menu, pricing, catalog, payment capture, Square checkout, images, or public design files changed.
