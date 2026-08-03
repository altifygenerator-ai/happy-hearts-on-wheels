Happy Hearts truck image cache-busting patch

Upload the CONTENTS of this folder to the ROOT of the existing GitHub repository and replace app/page.tsx.
This adds public/images/truck-location-2026.webp and changes the homepage and business schema to use that new filename.

The new filename prevents Vercel/Next Image and browser caches from continuing to serve the old /images/truck.webp asset.

Only these files are included:
- app/page.tsx
- public/images/truck-location-2026.webp

No Square, menu, checkout, webhook, order, payment, analytics, or environment files are changed.
